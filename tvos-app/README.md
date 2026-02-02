# StreamUI tvOS App with VLC Player

This folder contains the native Swift code needed to integrate VLC player into the tvOS app.

## Setup Instructions

### 1. Install CocoaPods (if not installed)
```bash
sudo gem install cocoapods
```

### 2. Copy files to your Xcode project
Copy these files to your Xcode project folder:
- `AppDelegate.swift` - Replace your existing AppDelegate
- `VLCPlayerBridge.swift` - Add to your project
- `Podfile` - Place in your Xcode project root

### 3. Install VLCKit
```bash
cd /path/to/your/xcode/project
pod install
```

### 4. Open the workspace
After running `pod install`, open the `.xcworkspace` file (not `.xcodeproj`):
```bash
open StreamUI.xcworkspace
```

### 5. Build and Run
1. Select your Apple TV as the target device
2. Build and run (Cmd+R)

## How it works

1. The `AppDelegate` registers `playWithVLC` function with the JavaScript context
2. When a stream is selected, the JavaScript calls `playWithVLC(url, title)`
3. The native `VLCPlayerBridge` creates a `VLCPlayerViewController`
4. VLCKit handles playback of MKV, AVI, and other formats

## Remote Controls

- **Select button**: Show/hide playback controls
- **Play/Pause**: Toggle playback
- **Menu button**: Exit player and return to app

## Troubleshooting

### "No such module 'MobileVLCKit'"
Run `pod install` and make sure to open the `.xcworkspace` file.

### Playback doesn't start
Check the Xcode console for error messages. The stream URL must be accessible from the Apple TV.

### Controls not working
Make sure the player view controller is the first responder for gesture recognition.
