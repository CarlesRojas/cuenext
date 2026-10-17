import WebKit

struct Cookie {
    var name: String
    var value: String
}

let gcmMessageIDKey = "00000000000" // update this with actual ID if using Firebase 

// URL for first launch
let rootUrl = URL(string: "https://www.cuenext.app")!

// allowed origin is for what we are sticking to pwa domain
// This should also appear in Info.plist
let allowedOrigins: [String] = ["www.cuenext.app"]

// auth origins will open in modal and show toolbar for back into the main origin.
// These should also appear in Info.plist
let authOrigins: [String] = [
    "accounts.dev",
    "clerk.accounts.dev",
    "clerk.cuenext.app",
    "clerk.dev"
]
// allowedOrigins + authOrigins <= 10

// Google sign in is moved out of the web view into a system sign in sheet (see startNativeGoogle)
let googleSignInHostPrefix = "accounts.google."
let nativeSignInPath = "/native-sign-in"
let nativeSignInCallbackScheme = "cuenext"

// Sign in diagnostics in the Xcode console, all under one prefix to filter by
func authLog(_ message: String) {
    #if DEBUG
    print("[CueNext auth] \(message)")
    #endif
}

let platformCookie = Cookie(name: "app-platform", value: "iOS App Store")

// UI options
let displayMode = "standalone" // standalone / fullscreen.
let adaptiveUIStyle = true     // iOS 15+ only. Change app theme on the fly to dark/light related to WebView background color.
let overrideStatusBar = false   // iOS 13-14 only. if you don't support dark/light system theme.
let statusBarTheme = "dark"    // dark / light, related to override option.
let pullToRefresh = true    // Enable/disable pull down to refresh page
