import UIKit
import TVMLKit
import MobileVLCKit

/// Bridge class to expose VLC player to TVML JavaScript
@objc class VLCPlayerBridge: NSObject {

    static let shared = VLCPlayerBridge()

    private var playerViewController: VLCPlayerViewController?
    private weak var navigationController: UINavigationController?

    func setup(with navigationController: UINavigationController?) {
        self.navigationController = navigationController
    }

    /// Play a video URL using VLC
    /// Called from JavaScript: VLCPlayer.play(url, title)
    @objc func play(_ url: String, title: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self,
                  let videoURL = URL(string: url) else {
                print("VLCPlayerBridge: Invalid URL: \(url)")
                return
            }

            let playerVC = VLCPlayerViewController()
            playerVC.configure(with: videoURL, title: title)
            playerVC.modalPresentationStyle = .fullScreen

            if let nav = self.navigationController {
                nav.present(playerVC, animated: true)
            } else if let rootVC = UIApplication.shared.windows.first?.rootViewController {
                rootVC.present(playerVC, animated: true)
            }

            self.playerViewController = playerVC
        }
    }

    @objc func stop() {
        DispatchQueue.main.async { [weak self] in
            self?.playerViewController?.dismiss(animated: true)
            self?.playerViewController = nil
        }
    }
}

/// Custom VLC Player View Controller for tvOS
class VLCPlayerViewController: UIViewController {

    private var mediaPlayer: VLCMediaPlayer!
    private var videoView: UIView!
    private var titleLabel: UILabel!
    private var loadingIndicator: UIActivityIndicatorView!
    private var controlsView: UIView!
    private var playPauseButton: UIButton!
    private var progressView: UIProgressView!
    private var timeLabel: UILabel!

    private var hideControlsTimer: Timer?
    private var videoTitle: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupPlayer()
        setupGestures()
    }

    func configure(with url: URL, title: String) {
        self.videoTitle = title

        DispatchQueue.main.async { [weak self] in
            self?.titleLabel?.text = title

            let media = VLCMedia(url: url)
            self?.mediaPlayer?.media = media
            self?.mediaPlayer?.play()
            self?.showLoading(true)
        }
    }

    private func setupUI() {
        view.backgroundColor = .black

        // Video view
        videoView = UIView()
        videoView.backgroundColor = .black
        videoView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(videoView)

        NSLayoutConstraint.activate([
            videoView.topAnchor.constraint(equalTo: view.topAnchor),
            videoView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            videoView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            videoView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        // Loading indicator
        loadingIndicator = UIActivityIndicatorView(style: .large)
        loadingIndicator.color = .white
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(loadingIndicator)

        NSLayoutConstraint.activate([
            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])

        // Controls overlay
        setupControls()
    }

    private func setupControls() {
        controlsView = UIView()
        controlsView.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        controlsView.translatesAutoresizingMaskIntoConstraints = false
        controlsView.alpha = 0
        view.addSubview(controlsView)

        NSLayoutConstraint.activate([
            controlsView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controlsView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controlsView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            controlsView.heightAnchor.constraint(equalToConstant: 150)
        ])

        // Title
        titleLabel = UILabel()
        titleLabel.text = videoTitle
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 32, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(titleLabel)

        // Progress view
        progressView = UIProgressView(progressViewStyle: .default)
        progressView.progressTintColor = .systemRed
        progressView.trackTintColor = .gray
        progressView.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(progressView)

        // Time label
        timeLabel = UILabel()
        timeLabel.text = "00:00 / 00:00"
        timeLabel.textColor = .white
        timeLabel.font = .monospacedDigitSystemFont(ofSize: 24, weight: .regular)
        timeLabel.translatesAutoresizingMaskIntoConstraints = false
        controlsView.addSubview(timeLabel)

        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: controlsView.topAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: controlsView.leadingAnchor, constant: 60),
            titleLabel.trailingAnchor.constraint(equalTo: controlsView.trailingAnchor, constant: -60),

            progressView.leadingAnchor.constraint(equalTo: controlsView.leadingAnchor, constant: 60),
            progressView.trailingAnchor.constraint(equalTo: controlsView.trailingAnchor, constant: -60),
            progressView.bottomAnchor.constraint(equalTo: timeLabel.topAnchor, constant: -10),

            timeLabel.leadingAnchor.constraint(equalTo: controlsView.leadingAnchor, constant: 60),
            timeLabel.bottomAnchor.constraint(equalTo: controlsView.bottomAnchor, constant: -30)
        ])
    }

    private func setupPlayer() {
        mediaPlayer = VLCMediaPlayer()
        mediaPlayer.delegate = self
        mediaPlayer.drawable = videoView
    }

    private func setupGestures() {
        // Tap to show/hide controls
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        tapGesture.allowedPressTypes = [NSNumber(value: UIPress.PressType.select.rawValue)]
        view.addGestureRecognizer(tapGesture)

        // Menu button to exit
        let menuGesture = UITapGestureRecognizer(target: self, action: #selector(handleMenu))
        menuGesture.allowedPressTypes = [NSNumber(value: UIPress.PressType.menu.rawValue)]
        view.addGestureRecognizer(menuGesture)

        // Play/Pause
        let playPauseGesture = UITapGestureRecognizer(target: self, action: #selector(handlePlayPause))
        playPauseGesture.allowedPressTypes = [NSNumber(value: UIPress.PressType.playPause.rawValue)]
        view.addGestureRecognizer(playPauseGesture)
    }

    @objc private func handleTap() {
        toggleControls()
    }

    @objc private func handleMenu() {
        mediaPlayer.stop()
        dismiss(animated: true)
    }

    @objc private func handlePlayPause() {
        if mediaPlayer.isPlaying {
            mediaPlayer.pause()
        } else {
            mediaPlayer.play()
        }
        showControls()
    }

    private func toggleControls() {
        if controlsView.alpha > 0 {
            hideControls()
        } else {
            showControls()
        }
    }

    private func showControls() {
        hideControlsTimer?.invalidate()

        UIView.animate(withDuration: 0.3) {
            self.controlsView.alpha = 1
        }

        hideControlsTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: false) { [weak self] _ in
            self?.hideControls()
        }
    }

    private func hideControls() {
        UIView.animate(withDuration: 0.3) {
            self.controlsView.alpha = 0
        }
    }

    private func showLoading(_ show: Bool) {
        if show {
            loadingIndicator.startAnimating()
        } else {
            loadingIndicator.stopAnimating()
        }
    }

    private func updateProgress() {
        guard mediaPlayer.media != nil else { return }

        let position = mediaPlayer.position
        progressView.progress = position

        let currentTime = mediaPlayer.time.intValue / 1000
        let totalTime = abs(mediaPlayer.remainingTime.intValue / 1000) + currentTime

        timeLabel.text = "\(formatTime(currentTime)) / \(formatTime(totalTime))"
    }

    private func formatTime(_ seconds: Int32) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%02d:%02d", minutes, secs)
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        mediaPlayer.stop()
        hideControlsTimer?.invalidate()
    }
}

// MARK: - VLCMediaPlayerDelegate
extension VLCPlayerViewController: VLCMediaPlayerDelegate {

    func mediaPlayerStateChanged(_ aNotification: Notification) {
        guard let player = aNotification.object as? VLCMediaPlayer else { return }

        switch player.state {
        case .playing:
            showLoading(false)
            showControls()
        case .buffering:
            showLoading(true)
        case .error:
            showLoading(false)
            showError("Playback error occurred")
        case .stopped, .ended:
            dismiss(animated: true)
        default:
            break
        }
    }

    func mediaPlayerTimeChanged(_ aNotification: Notification) {
        updateProgress()
    }

    private func showError(_ message: String) {
        let alert = UIAlertController(title: "Error", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
            self?.dismiss(animated: true)
        })
        present(alert, animated: true)
    }
}
