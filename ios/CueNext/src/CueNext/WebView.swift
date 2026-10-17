import UIKit
import WebKit
import AuthenticationServices
import SafariServices


func createWebView(container: UIView, WKSMH: WKScriptMessageHandler, WKND: WKNavigationDelegate, NSO: NSObject, VC: ViewController) -> WKWebView{

    let config = WKWebViewConfiguration()
    let userContentController = WKUserContentController()

    userContentController.add(WKSMH, name: "print")
    userContentController.add(WKSMH, name: "push-subscribe")
    userContentController.add(WKSMH, name: "push-permission-request")
    userContentController.add(WKSMH, name: "push-permission-state")
    userContentController.add(WKSMH, name: "push-token")
    userContentController.add(WKSMH, name: "native-auth-cancel")

    config.userContentController = userContentController

    config.limitsNavigationsToAppBoundDomains = true;
    config.allowsInlineMediaPlayback = true
    config.preferences.javaScriptCanOpenWindowsAutomatically = true
    config.preferences.setValue(true, forKey: "standalone")
    
    let webView = WKWebView(frame: calcWebviewFrame(webviewView: container, toolbarView: nil), configuration: config)
    
    // Set background color to match web app theme (#0a0a0a)
    webView.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
    webView.scrollView.backgroundColor = UIColor(red: 10/255, green: 10/255, blue: 10/255, alpha: 1.0)
    webView.isOpaque = true
    
    setCustomCookie(webView: webView)

    webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    webView.isHidden = true;
    webView.navigationDelegate = WKND
    webView.scrollView.bounces = false
    webView.scrollView.contentInsetAdjustmentBehavior = .never
    webView.allowsBackForwardNavigationGestures = true
    
    // Check if macCatalyst 16.4+ is available and if so, enable web inspector.
    // This allows the web app to be inspected using Safari Web Inspector. Supported on iOS 16.4+ and macOS 13.3+
    if #available(iOS 16.4, macOS 13.3, *) {
        webView.isInspectable = true
    }
    
    let deviceModel = UIDevice.current.model
    let osVersion = UIDevice.current.systemVersion
    webView.configuration.applicationNameForUserAgent = "Safari/604.1"
    webView.customUserAgent = "Mozilla/5.0 (\(deviceModel); CPU \(deviceModel) OS \(osVersion.replacingOccurrences(of: ".", with: "_")) like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/\(osVersion) Mobile/15E148 Safari/604.1 PWAShell"

    webView.addObserver(NSO, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: NSKeyValueObservingOptions.new, context: nil)
    
    #if DEBUG
    if #available(iOS 16.4, *) {
        webView.isInspectable = true
    }
    #endif
    
    return webView
}

func setAppStoreAsReferrer(contentController: WKUserContentController) {
    let scriptSource = "document.referrer = `app-info://platform/ios-store`;"
    let script = WKUserScript(source: scriptSource, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
    contentController.addUserScript(script);
}

func setCustomCookie(webView: WKWebView) {
    let _platformCookie = HTTPCookie(properties: [
        .domain: rootUrl.host!,
        .path: "/",
        .name: platformCookie.name,
        .value: platformCookie.value,
        .secure: "FALSE",
        .expires: NSDate(timeIntervalSinceNow: 31556926)
    ])!

    webView.configuration.websiteDataStore.httpCookieStore.setCookie(_platformCookie)

}

func calcWebviewFrame(webviewView: UIView, toolbarView: UIToolbar?) -> CGRect{
    if ((toolbarView) != nil) {
        return CGRect(x: 0, y: toolbarView!.frame.height, width: webviewView.frame.width, height: webviewView.frame.height - toolbarView!.frame.height)
    }
    else {
        let winScene = UIApplication.shared.connectedScenes.first
        let windowScene = winScene as! UIWindowScene
        var statusBarHeight = windowScene.statusBarManager?.statusBarFrame.height ?? 0

        switch displayMode {
        case "fullscreen":
            #if targetEnvironment(macCatalyst)
                if let titlebar = windowScene.titlebar {
                    titlebar.titleVisibility = .hidden
                    titlebar.toolbar = nil
                }
            #endif
            return CGRect(x: 0, y: 0, width: webviewView.frame.width, height: webviewView.frame.height)
        default:
            #if targetEnvironment(macCatalyst)
            statusBarHeight = 29
            #endif
            let windowHeight = webviewView.frame.height - statusBarHeight
            return CGRect(x: 0, y: statusBarHeight, width: webviewView.frame.width, height: windowHeight)
        }
    }
}

extension ViewController: WKUIDelegate, WKDownloadDelegate {
    // redirect new tabs to main webview
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        #if DEBUG
        print("Navigation popup: \(navigationAction.request.url?.absoluteString ?? "nil")")
        #endif
        if (navigationAction.targetFrame == nil) {
            webView.load(navigationAction.request)
        }
        return nil
    }
    // restrict navigation to target host, open external links in 3rd party apps
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        #if DEBUG
        // Find which navigations take the page out of its app-bound domains (Info.plist WKAppBoundDomains)
        let url = navigationAction.request.url
        print("Navigation: main=\(navigationAction.targetFrame?.isMainFrame.description ?? "new window") type=\(navigationAction.navigationType.rawValue) \(url?.scheme ?? "")://\(url?.host ?? "")\(url?.path ?? "")")
        #endif
        if (navigationAction.request.url?.scheme == "about") {
            return decisionHandler(.allow)
        }
        // Blob pages in frames are not downloads, e.g. Cloudflare's captcha on Clerk's sign up
        let isMainFrame = navigationAction.targetFrame?.isMainFrame != false
        if (navigationAction.shouldPerformDownload || (navigationAction.request.url?.scheme == "blob" && isMainFrame)) {
            return decisionHandler(.download)
        }
        if (navigationAction.request.url?.scheme == "blob") {
            return decisionHandler(.allow)
        }

        if let requestUrl = navigationAction.request.url{
            if let requestHost = requestUrl.host {
                // Google breaks inside the web view, so it runs in a system sign in sheet instead
                if requestHost.hasPrefix(googleSignInHostPrefix) && navigationAction.targetFrame?.isMainFrame != false {
                    decisionHandler(.cancel)
                    startNativeGoogle(webView: webView)
                    return
                }

                // NOTE: Match auth origin first, because host origin may be a subset of auth origin and may therefore always match
                let matchingAuthOrigin = authOrigins.first(where: { requestHost.range(of: $0) != nil })
                if (matchingAuthOrigin != nil) {
                    decisionHandler(.allow)
                    showAuthToolbar(webView: webView)
                    return
                }

                let matchingHostOrigin = allowedOrigins.first(where: { requestHost.range(of: $0) != nil })
                if (matchingHostOrigin != nil) {
                    // Open in main webview
                    decisionHandler(.allow)
                    if (!toolbarView.isHidden) {
                        toolbarView.isHidden = true
                        webView.frame = calcWebviewFrame(webviewView: webviewView, toolbarView: nil)
                    }
                    return
                }
                if (navigationAction.navigationType == .other &&
                    navigationAction.value(forKey: "syntheticClickType") as! Int == 0 &&
                    (navigationAction.targetFrame != nil) &&
                    // no error here, fake warning
                    (navigationAction.sourceFrame != nil)
                ) {
                    decisionHandler(.allow)
                    return
                }
                else {
                    decisionHandler(.cancel)
                }


                if ["http", "https"].contains(requestUrl.scheme?.lowercased() ?? "") {
                    // Can open with SFSafariViewController
                    let safariViewController = SFSafariViewController(url: requestUrl)
                    self.present(safariViewController, animated: true, completion: nil)
                } else {
                    // Scheme is not supported or no scheme is given, use openURL
                    if (UIApplication.shared.canOpenURL(requestUrl)) {
                        UIApplication.shared.open(requestUrl)
                    }
                }
            } else {
                decisionHandler(.cancel)
                if (navigationAction.request.url?.scheme == "tel" || navigationAction.request.url?.scheme == "mailto" ){
                    if (UIApplication.shared.canOpenURL(requestUrl)) {
                        UIApplication.shared.open(requestUrl)
                    }
                }
                else {
                    if requestUrl.isFileURL {
                        // not tested
                        downloadAndOpenFile(url: requestUrl.absoluteURL)
                    }
                    // if (requestUrl.absoluteString.contains("base64")){
                    //     downloadAndOpenBase64File(base64String: requestUrl.absoluteString)
                    // }
                }
            }
        }
        else {
            decisionHandler(.cancel)
        }

    }
    // Handle javascript: `window.alert(message: String)`
    func webView(_ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void) {

        // Set the message as the UIAlertController message
        let alert = UIAlertController(
            title: nil,
            message: message,
            preferredStyle: .alert
        )

        // Add a confirmation action “OK”
        let okAction = UIAlertAction(
            title: "OK",
            style: .default,
            handler: { _ in
                // Call completionHandler
                completionHandler()
            }
        )
        alert.addAction(okAction)

        // Display the NSAlert
        present(alert, animated: true, completion: nil)
    }
    // Handle javascript: `window.confirm(message: String)`
    func webView(_ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void) {

        // Set the message as the UIAlertController message
        let alert = UIAlertController(
            title: nil,
            message: message,
            preferredStyle: .alert
        )

        // Add a confirmation action “Cancel”
        let cancelAction = UIAlertAction(
            title: "Cancel",
            style: .cancel,
            handler: { _ in
                // Call completionHandler
                completionHandler(false)
            }
        )

        // Add a confirmation action “OK”
        let okAction = UIAlertAction(
            title: "OK",
            style: .default,
            handler: { _ in
                // Call completionHandler
                completionHandler(true)
            }
        )
        alert.addAction(cancelAction)
        alert.addAction(okAction)

        // Display the NSAlert
        present(alert, animated: true, completion: nil)
    }
    // Handle javascript: `window.prompt(prompt: String, defaultText: String?)`
    func webView(_ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void) {

        // Set the message as the UIAlertController message
        let alert = UIAlertController(
            title: nil,
            message: prompt,
            preferredStyle: .alert
        )

        // Add a confirmation action “Cancel”
        let cancelAction = UIAlertAction(
            title: "Cancel",
            style: .cancel,
            handler: { _ in
                // Call completionHandler
                completionHandler(nil)
            }
        )

        // Add a confirmation action “OK”
        let okAction = UIAlertAction(
            title: "OK",
            style: .default,
            handler: { _ in
                // Call completionHandler with Alert input
                if let input = alert.textFields?.first?.text {
                    completionHandler(input)
                }
            }
        )

        alert.addTextField { textField in
            textField.placeholder = defaultText
        }
        alert.addAction(cancelAction)
        alert.addAction(okAction)

        // Display the NSAlert
        present(alert, animated: true, completion: nil)
    }

    func downloadAndOpenFile(url: URL){

        let destinationFileUrl = url
        let sessionConfig = URLSessionConfiguration.default
        let session = URLSession(configuration: sessionConfig)
        let request = URLRequest(url:url)
        let task = session.downloadTask(with: request) { (tempLocalUrl, response, error) in
            if let tempLocalUrl = tempLocalUrl, error == nil {
                if let statusCode = (response as? HTTPURLResponse)?.statusCode {
                    print("Successfully download. Status code: \(statusCode)")
                }
                do {
                    try FileManager.default.copyItem(at: tempLocalUrl, to: destinationFileUrl)
                    self.openFile(url: destinationFileUrl)
                } catch (let writeError) {
                    print("Error creating a file \(destinationFileUrl) : \(writeError)")
                }
            } else {
                print("Error took place while downloading a file. Error description: \(error?.localizedDescription ?? "N/A") ")
            }
        }
        task.resume()
    }

    // func downloadAndOpenBase64File(base64String: String) {
    //     // Split the base64 string to extract the data and the file extension
    //     let components = base64String.components(separatedBy: ";base64,")

    //     // Make sure the base64 string has the correct format
    //     guard components.count == 2, let format = components.first?.split(separator: "/").last else {
    //         print("Invalid base64 string format")
    //         return
    //     }

    //     // Remove the data type prefix to get the base64 data
    //     let dataString = components.last!

    //     if let imageData = Data(base64Encoded: dataString) {
    //         let documentsUrl: URL  =  FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
    //         let destinationFileUrl = documentsUrl.appendingPathComponent("image.\(format)")

    //         do {
    //             try imageData.write(to: destinationFileUrl)
    //             self.openFile(url: destinationFileUrl)
    //         } catch {
    //             print("Error writing image to file url: \(destinationFileUrl): \(error)")
    //         }
    //     }
    // }

    func openFile(url: URL) {
        self.documentController = UIDocumentInteractionController(url: url)
        self.documentController?.delegate = self
        self.documentController?.presentPreview(animated: true)
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                suggestedFilename: String,
                completionHandler: @escaping (URL?) -> Void) {

        let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileURL = documentsPath.appendingPathComponent(suggestedFilename)

        // Remove existing file if it exists, otherwise it may show an old file/content just by having the same name.
        if FileManager.default.fileExists(atPath: fileURL.path) {
            try? FileManager.default.removeItem(at: fileURL)
        }

        self.openFile(url: fileURL)
        completionHandler(fileURL)
    }
}

// Google runs in ASWebAuthenticationSession instead of the web view. One time Clerk sign in tickets move the session
// between the two:
// - Sign in: /native-sign-in signs in with Google and returns a ticket, redeemed on the current page (or
//   /native-sign-in/complete as a fallback).
// - Connect a Google account from Manage account: a ticket from /api/native-sign-in-ticket signs the user in at
//   /native-sign-in/connect, which connects Google. The web view then refreshes the user in place.
extension ViewController: ASWebAuthenticationPresentationContextProviding {
    func startNativeGoogle(webView: WKWebView) {
        let returnTo = webView.backForwardList.currentItem?.url
        isSignedIn(webView: webView) { signedIn in
            if signedIn {
                self.startNativeConnect(webView: webView)
            } else {
                self.startNativeSignIn(returnTo: returnTo)
            }
        }
    }

    func startNativeSignIn(returnTo: URL?) {
        let state = UUID().uuidString
        startNativeAuth(path: nativeSignInPath, query: [URLQueryItem(name: "state", value: state)], waitingMessage: "Finish with Google in the window that just opened.", onCancel: {}) { items in
            guard items.first(where: { $0.name == "state" })?.value == state,
                  let ticket = items.first(where: { $0.name == "ticket" })?.value
            else { return }

            // Sign in on the current page so the app never navigates or shows a loading screen
            let script = """
                const signIn = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket })
                if (signIn.status !== 'complete') throw new Error('Sign in incomplete')
                await window.Clerk.setActive({ session: signIn.createdSessionId })
                // Google can be started from the sign in or the sign up modal
                window.Clerk.closeSignIn()
                window.Clerk.closeSignUp()
                return true
                """
            self.runPageScript(script, arguments: ["ticket": ticket]) { result in
                if case .success = result { return }
                // Fall back to the full page flow, e.g. if Clerk was not ready on this page
                self.loadNativeSignInComplete(ticket: ticket, returnTo: returnTo)
            }
        }
    }

    func loadNativeSignInComplete(ticket: String, returnTo: URL?) {
        var completeUrl = URLComponents(url: rootUrl, resolvingAgainstBaseURL: false)!
        completeUrl.path = nativeSignInPath + "/complete"
        completeUrl.queryItems = [URLQueryItem(name: "ticket", value: ticket)]
        if let returnTo = returnTo, returnTo.host == rootUrl.host {
            var redirect = returnTo.path.isEmpty ? "/" : returnTo.path
            if let query = returnTo.query { redirect += "?" + query }
            completeUrl.queryItems?.append(URLQueryItem(name: "redirect", value: redirect))
        }
        CueNext.webView.load(URLRequest(url: completeUrl.url!))
    }

    func startNativeConnect(webView: WKWebView) {
        // Refresh the user in place so Manage account shows the connected account without reloading the app
        let reloadUser = {
            self.runPageScript("await window.Clerk?.user?.reload(); return true")
        }
        let script = """
            const response = await fetch('/api/native-sign-in-ticket', { method: 'POST', headers: { 'X-CueNext-Native': '1' } })
            if (!response.ok) throw new Error('No sign in ticket')
            return (await response.json()).ticket
            """
        runPageScript(script) { result in
            guard case .success(let value) = result, let ticket = value as? String else {
                reloadUser()
                return
            }

            let query = [URLQueryItem(name: "state", value: UUID().uuidString), URLQueryItem(name: "ticket", value: ticket)]
            self.startNativeAuth(path: nativeSignInPath + "/connect", query: query, waitingMessage: "Finish connecting your Google account in the window that just opened.", onCancel: reloadUser) { _ in
                reloadUser()
            }
        }
    }

    func startNativeAuth(path: String, query: [URLQueryItem], waitingMessage: String, onCancel: @escaping () -> Void, onCallback: @escaping ([URLQueryItem]) -> Void) {
        // A new press replaces a sheet that is still open, e.g. one left behind other windows on Mac
        nativeSignInSession?.cancel()
        let sessionId = UUID()
        nativeSignInSessionId = sessionId
        nativeSignInOnCancel = onCancel

        var startUrl = URLComponents(url: rootUrl, resolvingAgainstBaseURL: false)!
        startUrl.path = path
        startUrl.queryItems = query

        let session = ASWebAuthenticationSession(url: startUrl.url!, callbackURLScheme: nativeSignInCallbackScheme) { [weak self] callbackUrl, _ in
            DispatchQueue.main.async {
                // A replaced sheet's cancellation must not end the one that replaced it
                guard let self = self, self.nativeSignInSessionId == sessionId else { return }
                self.nativeSignInSession = nil
                self.nativeSignInSessionId = nil
                self.nativeSignInOnCancel = nil
                self.hideNativeAuthOverlay()
                guard let callbackUrl = callbackUrl,
                      let items = URLComponents(url: callbackUrl, resolvingAgainstBaseURL: false)?.queryItems
                else {
                    onCancel()
                    return
                }
                onCallback(items)
            }
        }
        session.presentationContextProvider = self
        // A fresh browser session every time, so signing out in the app really lets you pick another account
        session.prefersEphemeralWebBrowserSession = true
        nativeSignInSession = session
        if session.start() {
            showNativeAuthOverlay(message: waitingMessage)
        } else {
            nativeSignInSession = nil
            nativeSignInSessionId = nil
            nativeSignInOnCancel = nil
            onCancel()
        }
    }

    // The overlay's Cancel button, for when closing the sheet's window is not reported (it can happen on Mac)
    func cancelNativeAuth() {
        guard let session = nativeSignInSession else { return }
        let onCancel = nativeSignInOnCancel
        nativeSignInSession = nil
        nativeSignInSessionId = nil
        nativeSignInOnCancel = nil
        session.cancel()
        hideNativeAuthOverlay()
        onCancel?()
    }

    // While the sheet is open, a panel over Clerk's card shows where to continue instead of its content, so people who
    // missed the new window (on Mac it can open out of view) don't press Google again. It lives outside Clerk's DOM and
    // follows the visible card every frame, because Clerk re-renders its card. Only the iOS app adds it.
    func showNativeAuthOverlay(message: String) {
        let script = """
            document.getElementById('native-auth-overlay')?.remove()
            const overlay = document.createElement('div')
            overlay.id = 'native-auth-overlay'
            overlay.innerHTML = `
                <style>
                    @keyframes native-auth-pulse { 0% { transform: scale(1); opacity: 0.4 } 100% { transform: scale(1.5); opacity: 0 } }
                </style>
                <div style="position:relative;width:64px;height:64px;margin-bottom:20px">
                    <div style="position:absolute;inset:0;border-radius:9999px;border:1.5px solid currentColor;animation:native-auth-pulse 2s ease-out infinite"></div>
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:rgba(128,128,128,0.1);background:color-mix(in srgb, currentColor 7%, transparent)">
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5v7a1.5 1.5 0 0 1-1.5 1.5H17" />
                            <rect x="4" y="10" width="13" height="10" rx="1.5" />
                            <path d="M4 13.5h13" />
                        </svg>
                    </div>
                </div>
                <p style="margin:0 0 6px;font-size:17px;font-weight:700;line-height:1.3">Continue in the new window</p>
                <p data-message style="margin:0;max-width:260px;font-size:13px;line-height:1.5;opacity:0.65"></p>
                <button data-cancel type="button" style="margin-top:20px;padding:6px 14px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:13px;font-weight:500;opacity:0.65;cursor:pointer">Cancel</button>
            `
            overlay.querySelector('[data-message]').textContent = message
            overlay.querySelector('[data-cancel]').addEventListener('click', () => {
                window.webkit?.messageHandlers?.['native-auth-cancel']?.postMessage(null)
            })
            const base = 'position:fixed;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;box-sizing:border-box;text-align:center'
            document.documentElement.appendChild(overlay)

            const isTransparent = color => color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
            const isShown = element => {
                for (let node = element; node && node !== document.documentElement; node = node.parentElement) {
                    const style = getComputedStyle(node)
                    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
                }
                const rect = element.getBoundingClientRect()
                return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth
            }
            // The card people see (sign in, sign up or Manage account). Clerk can keep other cards in the page, hidden
            // or off screen, e.g. the sign in card after switching to sign up, so prefer the one on top at its center.
            const findCard = () => {
                const cards = [...document.querySelectorAll('.cl-cardBox')].filter(isShown)
                const onTop = cards.find(card => {
                    const rect = card.getBoundingClientRect()
                    const hit = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2).find(element => !overlay.contains(element))
                    return hit && card.contains(hit)
                })
                return onTop ?? cards[cards.length - 1]
            }
            const follow = () => {
                if (!overlay.isConnected) return
                const card = findCard()
                if (card) {
                    const rect = card.getBoundingClientRect()
                    const style = getComputedStyle(card)
                    const innerCard = card.querySelector('.cl-card')
                    const background = isTransparent(style.backgroundColor) && innerCard ? getComputedStyle(innerCard).backgroundColor : style.backgroundColor
                    overlay.style.cssText = `${base};top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;border-radius:${style.borderRadius};background:${background};color:${style.color};font-family:${style.fontFamily}`
                } else {
                    overlay.style.cssText = `${base};inset:0;background:rgba(10,10,10,0.9);color:white;font-family:${getComputedStyle(document.body).fontFamily}`
                }
                requestAnimationFrame(follow)
            }
            follow()
            // Reported in the Xcode console to debug where the notice goes
            return [...document.querySelectorAll('.cl-cardBox')].map(card => {
                const rect = card.getBoundingClientRect()
                return `${card.className.split(' ').find(name => name.startsWith('cl-cardBox')) ?? 'cl-cardBox'} ${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)} shown:${isShown(card)} chosen:${card === findCard()}`
            }).join(' | ') || 'no Clerk card'
            """
        let sessionId = nativeSignInSessionId
        runPageScript(script, arguments: ["message": message]) { result in
            switch result {
            case .success(let cards): print("Native auth overlay cards: \(cards)")
            case .failure(let error): print("Native auth overlay failed: \(error)")
            }
            // A retried attempt can land after the sheet already closed
            if self.nativeSignInSessionId != sessionId || sessionId == nil { self.hideNativeAuthOverlay() }
        }
    }

    func hideNativeAuthOverlay() {
        runPageScript("document.getElementById('native-auth-overlay')?.remove(); return true")
    }

    func showAuthToolbar(webView: WKWebView) {
        if (toolbarView.isHidden) {
            toolbarView.isHidden = false
            webView.frame = calcWebviewFrame(webviewView: webviewView, toolbarView: toolbarView)
        }
    }

    // Ask Clerk on the page: its cookies can still look signed in after an unfinished sign in or sign up
    func isSignedIn(webView: WKWebView, completion: @escaping (Bool) -> Void) {
        runPageScript("return Boolean(window.Clerk?.user)") { result in
            if case .success(let value) = result, let signedIn = value as? Bool {
                completion(signedIn)
            } else {
                completion(false)
            }
        }
    }

    // Runs JavaScript on the app's page. Right after the Google navigation is cancelled, WebKit can still treat the
    // page as leaving its app-bound domains and refuse scripts for a moment, so those attempts are retried.
    func runPageScript(_ script: String, arguments: [String: Any] = [:], attempt: Int = 0, completion: ((Result<Any, Error>) -> Void)? = nil) {
        CueNext.webView.callAsyncJavaScript(script, arguments: arguments, in: nil, in: .page) { result in
            if case .failure(let error) = result,
               (error as NSError).domain == WKError.errorDomain,
               (error as NSError).code == WKError.javaScriptAppBoundDomain.rawValue,
               attempt < 10 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    self.runPageScript(script, arguments: arguments, attempt: attempt + 1, completion: completion)
                }
                return
            }
            completion?(result)
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return view.window ?? ASPresentationAnchor()
    }
}
