/* Renders the two pieces of Android artwork that must not come from the deployed site.
 *
 * Everything else the wrapper shows is downloaded by `bubblewrap update` from the URLs in
 * android/twa-manifest.json and needs nothing from here. These two do:
 *
 * - The splash screens. Bubblewrap builds splash.png by resizing the whole icon to fill the canvas,
 *   which leaves the mark at 47.25% of it and reads as oversized on launch. These masters put it at
 *   30.67%.
 *
 * - The adaptive icon layers. They are what the launcher actually shows, and Bubblewrap downloads
 *   them from `maskableIconUrl`, so the padding around the mark is whatever the live site happens
 *   to serve at the moment of the release. Rendering them here pins that padding to the repo, and
 *   draws them at the size they are displayed at instead of the smaller one Bubblewrap ships.
 *
 * Run this whenever the logo changes, then android/apply-assets.sh.
 *
 * Plain Node over the PNG format itself: the work is a resample and a composite, and an image
 * library would mean a native binary in a repo that otherwise builds a website.
 */

import { deflateSync, inflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/* The mark on its own, transparent, for the splash. logo256.png is the same artwork cropped to its
 * edges, and either would do: the mark is sized by the pixels it draws, not by its canvas. */
const MARK_SOURCE = 'public/logo512.png'
const SPLASH_DIRECTORY = 'android/splash'

/* The icon as designed, background and padding included, which is also what the Web Manifest serves
 * to browsers as the maskable icon. */
const ICON_SOURCE = 'public/maskableIcon512.png'
const ICON_DIRECTORY = 'android/icon'

/* The field the mark sits on for the splash. Matches `backgroundColor` in twa-manifest.json, which
 * is what Android paints around the splash image while the app starts. */
const SPLASH_BACKGROUND = [0x0a, 0x0a, 0x0a]

/* The mark's longer side on the splash, as a share of the canvas: 65% of the 47.25% Bubblewrap's
 * own splash gives it. */
const MARK_FRACTION = 0.30667

/* The five splash sizes Bubblewrap generates, and so the five this replaces. */
const SPLASH_SIZES = [
  { density: 'mdpi', canvas: 300 },
  { density: 'hdpi', canvas: 450 },
  { density: 'xhdpi', canvas: 600 },
  { density: 'xxhdpi', canvas: 900 },
  { density: 'xxxhdpi', canvas: 1200 },
]

const DENSITIES = [
  { density: 'mdpi', scale: 1 },
  { density: 'hdpi', scale: 1.5 },
  { density: 'xhdpi', scale: 2 },
  { density: 'xxhdpi', scale: 3 },
  { density: 'xxxhdpi', scale: 4 },
]

/* Adaptive icon geometry, in dp. The layer is 108, launchers only ever show the central 72, and the
 * 8.5 is the inset Bubblewrap writes into mipmap-anydpi-v26/ic_launcher.xml, which leaves 91dp for
 * the layer rendered here. Read those from Bubblewrap's template if it ever changes them, since the
 * figures this prints are measured against them. */
const LAYER_DP = 108
const VISIBLE_DP = 72
const BUBBLEWRAP_INSET_DP = 8.5

/* How much of the 91dp the artwork is drawn into. At 1 the icon is full bleed, which is what
 * `maskableIcon512.png` is drawn for: a maskable icon carries its own safe-zone padding, 26.6% a
 * side here, and the crop down to the visible 72dp leaves the mark at a little under 60% of it.
 * Lower this to pad the mark further; the figures printed below say where it lands. */
const ICON_SCALE = 1

/* Alpha at or above which a pixel of the transparent master counts as drawn, so a mark with a soft
 * edge is measured by its body rather than by the faintest pixel of its falloff. */
const INK_ALPHA = 24

/* The same judgement for the opaque icon, where the mark has to be told from its background by
 * colour instead: total channel distance from the border colour. */
const BORDER_DISTANCE = 45

const chunks = buffer => {
  const found = []
  let offset = 8

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    found.push({
      type: buffer.toString('latin1', offset + 4, offset + 8),
      data: buffer.subarray(offset + 8, offset + 8 + length),
    })
    offset += length + 12
  }

  return found
}

const paeth = (left, up, corner) => {
  const estimate = left + up - corner
  const toLeft = Math.abs(estimate - left)
  const toUp = Math.abs(estimate - up)
  const toCorner = Math.abs(estimate - corner)
  if (toLeft <= toUp && toLeft <= toCorner) return left
  return toUp <= toCorner ? up : corner
}

/* An 8-bit non-interlaced PNG, opaque or not, unfiltered into straight RGBA. Both sources are
 * written by the design tooling in this repo, so the narrow support is the whole of what is read
 * rather than a subset of it, and anything else is worth failing on loudly. */
const read = file => {
  const buffer = readFileSync(file)
  const parts = chunks(buffer)
  const header = parts.find(part => part.type === 'IHDR')
  if (!header) throw new Error(`${file} is not a PNG.`)

  const width = header.data.readUInt32BE(0)
  const height = header.data.readUInt32BE(4)
  const depth = header.data[8]
  const colour = header.data[9]
  const interlace = header.data[12]

  if (depth !== 8 || interlace !== 0 || (colour !== 2 && colour !== 6)) {
    throw new Error(`${file}: expected an 8-bit non-interlaced RGB or RGBA PNG, got depth ${depth} colour ${colour}.`)
  }

  const channels = colour === 6 ? 4 : 3
  const raw = inflateSync(Buffer.concat(parts.filter(part => part.type === 'IDAT').map(part => part.data)))
  const stride = width * channels
  const lines = Buffer.alloc(height * stride)

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const source = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const line = lines.subarray(y * stride, (y + 1) * stride)
    const previous = y > 0 ? lines.subarray((y - 1) * stride, y * stride) : null

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? line[x - channels] : 0
      const up = previous ? previous[x] : 0
      const corner = previous && x >= channels ? previous[x - channels] : 0

      if (filter === 0) line[x] = source[x]
      else if (filter === 1) line[x] = (source[x] + left) & 0xff
      else if (filter === 2) line[x] = (source[x] + up) & 0xff
      else if (filter === 3) line[x] = (source[x] + ((left + up) >> 1)) & 0xff
      else if (filter === 4) line[x] = (source[x] + paeth(left, up, corner)) & 0xff
      else throw new Error(`${file}: unknown row filter ${filter}.`)
    }
  }

  const data = Buffer.alloc(width * height * 4)
  for (let pixel = 0; pixel < width * height; pixel++) {
    data[pixel * 4] = lines[pixel * channels]
    data[pixel * 4 + 1] = lines[pixel * channels + 1]
    data[pixel * 4 + 2] = lines[pixel * channels + 2]
    data[pixel * 4 + 3] = channels === 4 ? lines[pixel * channels + 3] : 0xff
  }

  return { data, width, height }
}

const write = (file, image) => {
  const stride = image.width * 4
  const raw = Buffer.alloc(image.height * (stride + 1))

  for (let y = 0; y < image.height; y++) {
    raw[y * (stride + 1)] = 0
    image.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const header = Buffer.alloc(13)
  header.writeUInt32BE(image.width, 0)
  header.writeUInt32BE(image.height, 4)
  header.set([8, 6, 0, 0, 0], 8)

  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body))
    return Buffer.concat([length, body, crc])
  }

  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

const crc32 = buffer => {
  let value = 0xffffffff
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

/* Alpha-premultiplied RGBA, which is what makes the resample below correct: interpolating raw
 * colour across an edge lets a transparent pixel's colour bleed into its neighbours. */
const premultiply = image => {
  const data = new Float32Array(image.width * image.height * 4)

  for (let i = 0; i < data.length; i += 4) {
    const alpha = image.data[i + 3] / 255
    data[i] = image.data[i] * alpha
    data[i + 1] = image.data[i + 1] * alpha
    data[i + 2] = image.data[i + 2] * alpha
    data[i + 3] = image.data[i + 3]
  }

  return { data, width: image.width, height: image.height }
}

/* The box every drawn pixel fits inside, so the mark can be sized and centred by what it draws
 * rather than by the canvas it was exported on. What counts as drawn differs between a transparent
 * master and an opaque icon, hence the predicate. */
const markBounds = (image, file, drawn) => {
  let left = image.width
  let right = -1
  let top = image.height
  let bottom = -1

  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4
      if (!drawn(image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3])) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  if (right < 0) throw new Error(`Found no artwork in ${file}.`)
  return { left, top, width: right - left + 1, height: bottom - top + 1 }
}

const inked = (red, green, blue, alpha) => alpha >= INK_ALPHA

const opaque = border => (red, green, blue) =>
  Math.abs(red - border[0]) + Math.abs(green - border[1]) + Math.abs(blue - border[2]) > BORDER_DISTANCE

/* Triangle filter, applied along one axis. The support widens as the image shrinks, so a downscale
 * averages every source pixel falling into a target one instead of sampling two of them, and an
 * upscale stays plain bilinear. */
const axisWeights = (sourceSize, targetSize) => {
  const scale = sourceSize / targetSize
  const support = Math.max(1, scale)

  return Array.from({ length: targetSize }, (_, index) => {
    const centre = (index + 0.5) * scale
    const start = Math.max(0, Math.ceil(centre - support - 0.5))
    const end = Math.min(sourceSize - 1, Math.floor(centre + support - 0.5))
    const weights = []
    let total = 0

    for (let source = start; source <= end; source++) {
      const weight = Math.max(0, 1 - Math.abs(source + 0.5 - centre) / support)
      weights.push(weight)
      total += weight
    }

    return { start, weights: weights.map(weight => weight / total) }
  })
}

const resample = (source, width, height) => {
  const horizontal = axisWeights(source.width, width)
  const vertical = axisWeights(source.height, height)

  const rows = new Float32Array(width * source.height * 4)
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < width; x++) {
      const { start, weights } = horizontal[x]
      const target = (y * width + x) * 4
      for (let k = 0; k < weights.length; k++) {
        const sample = (y * source.width + start + k) * 4
        for (let channel = 0; channel < 4; channel++)
          rows[target + channel] += source.data[sample + channel] * weights[k]
      }
    }
  }

  const data = new Float32Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    const { start, weights } = vertical[y]
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4
      for (let k = 0; k < weights.length; k++) {
        const sample = ((start + k) * width + x) * 4
        for (let channel = 0; channel < 4; channel++) data[target + channel] += rows[sample + channel] * weights[k]
      }
    }
  }

  return { data, width, height }
}

/* The image over a flat colour. Premultiplied source, so the blend is an add rather than a mix, and
 * the result is opaque. */
const compose = (image, canvas, background, offsetX, offsetY) => {
  const data = Buffer.alloc(canvas * canvas * 4)

  for (let y = 0; y < canvas; y++) {
    for (let x = 0; x < canvas; x++) {
      const target = (y * canvas + x) * 4
      const sourceX = x - offsetX
      const sourceY = y - offsetY
      const inside = sourceX >= 0 && sourceX < image.width && sourceY >= 0 && sourceY < image.height
      const sample = (sourceY * image.width + sourceX) * 4
      const alpha = inside ? image.data[sample + 3] / 255 : 0

      for (let channel = 0; channel < 3; channel++) {
        const over = inside ? image.data[sample + channel] : 0
        data[target + channel] = Math.round(over + background[channel] * (1 - alpha))
      }
      data[target + 3] = 255
    }
  }

  return { data, width: canvas, height: canvas }
}

const renderSplashScreens = () => {
  const source = read(MARK_SOURCE)
  const bounds = markBounds(source, MARK_SOURCE, inked)
  const premultiplied = premultiply(source)
  const markLongSide = Math.max(bounds.width, bounds.height)

  console.log(`${MARK_SOURCE}: ${source.width}x${source.height}, mark ${bounds.width}x${bounds.height}`)

  for (const { density, canvas } of SPLASH_SIZES) {
    const scale = (canvas * MARK_FRACTION) / markLongSide
    const mark = resample(premultiplied, Math.round(source.width * scale), Math.round(source.height * scale))

    /* Centre on the mark, not on the source canvas, in case the artwork is not centred in it. */
    const offsetX = Math.round(canvas / 2 - (bounds.left + bounds.width / 2) * scale)
    const offsetY = Math.round(canvas / 2 - (bounds.top + bounds.height / 2) * scale)

    write(
      join(SPLASH_DIRECTORY, `drawable-${density}`, 'splash.png'),
      compose(mark, canvas, SPLASH_BACKGROUND, offsetX, offsetY),
    )

    const drawn = Math.round(markLongSide * scale)
    console.log(`  ${density}: ${canvas}px canvas, mark ${drawn}px (${((100 * drawn) / canvas).toFixed(2)}%)`)
  }
}

const renderAdaptiveIcon = () => {
  const source = read(ICON_SOURCE)
  const premultiplied = premultiply(source)

  /* The dp the layer is drawn into, and the share of it that survives the launcher's mask. */
  const drawnDp = LAYER_DP - 2 * BUBBLEWRAP_INSET_DP
  const survives = VISIBLE_DP / drawnDp

  /* The icon's own border colour, so any padding added here is seamless with the artwork's
   * background whatever that background becomes. */
  const border = [source.data[0], source.data[1], source.data[2]]
  const bounds = markBounds(source, ICON_SOURCE, opaque(border))
  const sourceShare = Math.max(bounds.width, bounds.height) / source.width

  console.log(`\n${ICON_SOURCE}: mark ${bounds.width}x${bounds.height} (${(100 * sourceShare).toFixed(1)}% of it)`)
  console.log(`  padding onto #${border.map(channel => channel.toString(16).padStart(2, '0')).join('')}`)

  for (const { density, scale } of DENSITIES) {
    /* One device pixel per pixel of the 91dp the layer is drawn into, where Bubblewrap's own layers
     * are smaller than that and get magnified at draw time. */
    const canvas = Math.round(drawnDp * scale)
    const inner = Math.round(canvas * ICON_SCALE)
    const offset = Math.round((canvas - inner) / 2)
    const scaled = resample(premultiplied, inner, inner)

    write(join(ICON_DIRECTORY, `mipmap-${density}`, 'ic_maskable.png'), compose(scaled, canvas, border, offset, offset))

    /* What the launcher will show, as a share of the visible 72dp: the mark's size in the source,
     * shrunk by any padding added here, magnified by the crop the mask makes. */
    const markShare = sourceShare * (inner / canvas) * (1 / survives)
    console.log(
      `  ${density}: ${canvas}px layer, artwork at ${inner}px, mark ${(100 * markShare).toFixed(1)}% of the visible ${VISIBLE_DP}dp`,
    )
  }
}

renderSplashScreens()
renderAdaptiveIcon()

console.log('\nNow run android/apply-assets.sh to copy these into the Android project.')
