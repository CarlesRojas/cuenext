// The iOS app's system sign in sheet closes when it reaches this URL (see startNativeAuth in WebView.swift)
export const NATIVE_CALLBACK_URL = 'cuenext://native-sign-in'

// Where every Google sign in or sign up in the sheet must end, so the session is handed back to the app
export const nativeSignInDoneUrl = (state: string) =>
  `${window.location.origin}/native-sign-in/done?state=${encodeURIComponent(state)}`
