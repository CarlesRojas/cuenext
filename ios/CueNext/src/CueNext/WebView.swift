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
        if (navigationAction.targetFrame == nil) {
            webView.load(navigationAction.request)
        }
        return nil
    }
    // restrict navigation to target host, open external links in 3rd party apps
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if (navigationAction.request.url?.scheme == "about") {
            return decisionHandler(.allow)
        }
        if (navigationAction.shouldPerformDownload || navigationAction.request.url?.scheme == "blob") {
            return decisionHandler(.download)
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
        guard nativeSignInSession == nil else { return }

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
        startNativeAuth(path: nativeSignInPath, query: [URLQueryItem(name: "state", value: state)], waitingMessage: "Finish signing in with Google in the window that just opened.", onCancel: {
            CueNext.webView.callAsyncJavaScript("window.Clerk?.closeSignIn()", arguments: [:], in: nil, in: .page)
        }) { items in
            guard items.first(where: { $0.name == "state" })?.value == state,
                  let ticket = items.first(where: { $0.name == "ticket" })?.value
            else { return }

            // Sign in on the current page so the app never navigates or shows a loading screen
            let script = """
                const signIn = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket })
                if (signIn.status !== 'complete') throw new Error('Sign in incomplete')
                await window.Clerk.setActive({ session: signIn.createdSessionId })
                window.Clerk.closeSignIn()
                return true
                """
            CueNext.webView.callAsyncJavaScript(script, arguments: ["ticket": ticket], in: nil, in: .page) { result in
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
            CueNext.webView.callAsyncJavaScript("await window.Clerk?.user?.reload()", arguments: [:], in: nil, in: .page)
        }
        let script = """
            const response = await fetch('/api/native-sign-in-ticket', { method: 'POST', headers: { 'X-CueNext-Native': '1' } })
            if (!response.ok) throw new Error('No sign in ticket')
            return (await response.json()).ticket
            """
        webView.callAsyncJavaScript(script, arguments: [:], in: nil, in: .page) { result in
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
        guard nativeSignInSession == nil else { return }

        var startUrl = URLComponents(url: rootUrl, resolvingAgainstBaseURL: false)!
        startUrl.path = path
        startUrl.queryItems = query

        let session = ASWebAuthenticationSession(url: startUrl.url!, callbackURLScheme: nativeSignInCallbackScheme) { [weak self] callbackUrl, _ in
            DispatchQueue.main.async {
                self?.nativeSignInSession = nil
                self?.hideNativeAuthOverlay()
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
            onCancel()
        }
    }

    // While the sheet is open, Clerk's card shows where to continue instead of its content, so people who missed the
    // new window (on Mac it can open out of view) don't press Google again. Only the iOS app adds it.
    func showNativeAuthOverlay(message: String) {
        let script = """
            document.getElementById('native-auth-overlay')?.remove()
            const overlay = document.createElement('div')
            overlay.id = 'native-auth-overlay'
            const title = document.createElement('p')
            title.textContent = 'Continue in the new window'
            title.style.cssText = 'margin:0;font-size:17px;font-weight:700'
            const body = document.createElement('p')
            body.textContent = message
            body.style.cssText = 'margin:0;font-size:13px;opacity:0.65'
            overlay.append(title, body)

            const card = document.querySelector('.cl-cardBox')
            if (card) {
                // Cover the card exactly, with its own colors
                const cardStyle = getComputedStyle(card)
                const isTransparent = color => color === 'transparent' || color === 'rgba(0, 0, 0, 0)'
                const innerCard = card.querySelector('.cl-card')
                const background = isTransparent(cardStyle.backgroundColor) && innerCard ? getComputedStyle(innerCard).backgroundColor : cardStyle.backgroundColor
                if (cardStyle.position === 'static') card.style.position = 'relative'
                overlay.style.cssText = `position:absolute;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;text-align:center;border-radius:inherit;background:${background};color:${cardStyle.color}`
                card.appendChild(overlay)
            } else {
                overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px;text-align:center;background:rgba(10,10,10,0.9);color:white'
                document.body.appendChild(overlay)
            }
            return true
            """
        CueNext.webView.callAsyncJavaScript(script, arguments: ["message": message], in: nil, in: .page)
    }

    func hideNativeAuthOverlay() {
        CueNext.webView.callAsyncJavaScript("document.getElementById('native-auth-overlay')?.remove(); return true", arguments: [:], in: nil, in: .page)
    }

    func showAuthToolbar(webView: WKWebView) {
        if (toolbarView.isHidden) {
            toolbarView.isHidden = false
            webView.frame = calcWebviewFrame(webviewView: webviewView, toolbarView: toolbarView)
        }
    }

    // Clerk keeps __client_uat at "0" while signed out and at the last sign in time while signed in
    func isSignedIn(webView: WKWebView, completion: @escaping (Bool) -> Void) {
        webView.configuration.websiteDataStore.httpCookieStore.getAllCookies { cookies in
            let signedIn = cookies.contains { cookie in
                cookie.name.hasPrefix("__client_uat") &&
                cookie.domain.hasSuffix(rootUrl.host!.replacingOccurrences(of: "www.", with: "")) &&
                !cookie.value.isEmpty && cookie.value != "0"
            }
            DispatchQueue.main.async { completion(signedIn) }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return view.window ?? ASPresentationAnchor()
    }
}
