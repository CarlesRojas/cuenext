import { LiquidGlass } from '#/component/LiquidGlass'
import { cn } from '#/lib/cn'
import { createFileRoute } from '@tanstack/react-router'
import { isIOS } from 'react-device-detect'

export const Route = createFileRoute('/support')({ component: Support })

function Support() {
  return (
    <main
      suppressHydrationWarning
      className={cn(
        'prose prose-neutral dark:prose-invert screen-px screen-py relative mx-auto mb-20 h-fit w-full max-w-5xl',
        isIOS && 'mb-24',
      )}
    >
      <h1>Support</h1>

      <p>
        We're here to help! If you have questions, encounter issues, or want to provide feedback about our app, please
        don't hesitate to reach out to us using any of the contact methods below.
      </p>

      <h2>Contact Information</h2>

      <LiquidGlass
        className="not-prose h-full w-full rounded-3xl"
        wrapperClassName="flex flex-col text-left items-start gap-6 p-6"
      >
        <div>
          <strong>Email:</strong>
          <br />
          <a href="mailto:cuenext@carlesrojas.com" className="text-blue-600 hover:underline dark:text-blue-400">
            cuenext@carlesrojas.com
          </a>
        </div>

        <div>
          <strong>Phone:</strong>
          <br />
          <a href="tel:+34617741204" className="text-blue-600 hover:underline dark:text-blue-400">
            +34 617 741 204
          </a>
        </div>

        <div>
          <strong>Mailing Address:</strong>
          <br />
          CueNext Support Team
          <br />
          C/ Provença 84
          <br />
          Escalera Iz, Entresuelo 1a
          <br />
          Barcelona, 08029
          <br />
          Spain
        </div>
      </LiquidGlass>

      <h2>What We Can Help With</h2>

      <ul>
        <li>
          <strong>Technical Issues:</strong> App crashes, login problems, syncing issues, or other bugs
        </li>
        <li>
          <strong>Feature Requests:</strong> Suggestions for new features or improvements
        </li>
        <li>
          <strong>Account Support:</strong> Help with account settings, data management, or privacy concerns
        </li>
        <li>
          <strong>General Feedback:</strong> Your thoughts on the app and user experience
        </li>
        <li>
          <strong>Business Inquiries:</strong> Partnership opportunities or press inquiries
        </li>
      </ul>

      <h2>Response Time</h2>

      <p>
        We typically respond to support requests within 24-48 hours during business days (Monday-Friday). For urgent
        technical issues, please include "URGENT" in your email subject line.
      </p>

      <h2>Before You Contact Us</h2>

      <p>To help us assist you more efficiently, please:</p>

      <ul>
        <li>Include your device model and operating system version</li>
        <li>Describe the issue in detail, including steps to reproduce it</li>
        <li>Attach screenshots if applicable</li>
        <li>Let us know if the issue started after a recent app update</li>
      </ul>

      <h2>Privacy & Data</h2>

      <p>
        When you contact us, we may need to access your account information to provide support. We handle all support
        inquiries in accordance with our{' '}
        <a href="/legal/privacy-policy" className="text-blue-600 hover:underline dark:text-blue-400">
          Privacy Policy
        </a>
        . We never share your personal information with third parties for marketing purposes.
      </p>
    </main>
  )
}
