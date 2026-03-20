import UIKit
import AVFoundation

/// Delegate to handle touch event of the close button.
protocol HeaderViewControllerDelegate: class {
    func headerViewControllerDidTapCloseButton(_ controller: HeaderViewController)
}

/// View controller with title label and close button.
/// It will be added as a child view controller if `BarcodeScannerController` is being presented.
public final class HeaderViewController: UIViewController {
    weak var delegate: HeaderViewControllerDelegate?
    
    // MARK: - UI properties
    
    /// Header view with title label and close button.
    public private(set) lazy var navigationBar: UINavigationBar = self.makeNavigationBar()
    /// Title view of the navigation bar.
    public private(set) lazy var titleLabel: UILabel = self.makeTitleLabel()
    /// Left bar button item of the navigation bar.
    public private(set) lazy var closeButton: UIButton = self.makeCloseButton()
    /// Right bar button item of the navigation bar.
    public private(set) lazy var btnFlash: UIButton = self.makeFlashButton()
     
    
//    /// Button to change torch mode.
//    public private(set) lazy var flashButton: UIButton = .init(type: .custom)
//    /// Video capture device. This may be nil when running in Simulator.
//    private var captureDevice: AVCaptureDevice?
//
//    /// The current torch mode on the capture device.
//    private var torchMode: TorchMode = .off {
//        didSet {
//            guard let captureDevice = captureDevice, captureDevice.hasFlash else { return }
//            guard captureDevice.isTorchModeSupported(torchMode.captureTorchMode) else { return }
//
//            do {
//                try captureDevice.lockForConfiguration()
//                captureDevice.torchMode = torchMode.captureTorchMode
//                captureDevice.unlockForConfiguration()
//            } catch {}
//
//            flashButton.setImage(torchMode.image, for: UIControl.State())
//        }
//    }
    
    // MARK: - View lifecycle
    
    public override func viewDidLoad() {
        super.viewDidLoad()
        
        navigationBar.delegate = self
        closeButton.addTarget(self, action: #selector(handleCloseButtonTap), for: .touchUpInside)
        btnFlash.addTarget(self,action: #selector(handleFlashButtonTap(_:)),for: .touchUpInside)
        
        view.addSubview(navigationBar)
        setupConstraints()
       
    }
    
    // MARK: - Actions
    
    @objc private func handleCloseButtonTap() {
        delegate?.headerViewControllerDidTapCloseButton(self)
    }
    
    /// Sets the next torch mode.
    @objc private func handleFlashButtonTap(_ sender: UIButton) {
        sender.isSelected = !sender.isSelected
        //sender.setImage(UIImage(named: sender.isSelected ? "TorchMode-On" : "TorchMode-Off"), for: .normal)
        if #available(iOS 13.0, *) {
            sender.setImage(UIImage(systemName: sender.isSelected ? "flashlight.on.fill" : "flashlight.off.fill"), for: .normal)
        } else {
            // Fallback on earlier versions
        }
        toggleTorch(on: sender.isSelected)
    }
    
    func toggleTorch(on: Bool) {
        guard let device = AVCaptureDevice.default(for: .video) else { return }

        if device.hasTorch {
            do {
                try device.lockForConfiguration()

                if on == true {
                    device.torchMode = .on
                } else {
                    device.torchMode = .off
                }

                device.unlockForConfiguration()
            } catch {
                print("Torch could not be used")
            }
        } else {
            print("Torch is not available")
        }
    }
    
    // MARK: - Layout
    
    private func setupConstraints() {
        NSLayoutConstraint.activate(
            navigationBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            navigationBar.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        )
        
        if #available(iOS 11, *) {
            navigationBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor).isActive = true
        } else {
            navigationBar.topAnchor.constraint(equalTo: topLayoutGuide.bottomAnchor).isActive = true
        }
    }
}

// MARK: - Subviews factory

private extension HeaderViewController {
    func makeNavigationBar() -> UINavigationBar {
        let navigationBar = UINavigationBar()
//        navigationBar.backgroundColor = .red
        navigationBar.setBackgroundImage(UIImage(), for: .default)
        navigationBar.shadowImage = UIImage()
        navigationBar.isTranslucent = true

        navigationBar.items = [makeNavigationItem()]
        return navigationBar
    }
    
    func makeNavigationItem() -> UINavigationItem {
        let navigationItem = UINavigationItem()
        closeButton.sizeToFit()
        navigationItem.leftBarButtonItem = UIBarButtonItem(customView: closeButton)
        navigationItem.rightBarButtonItem = UIBarButtonItem(customView: btnFlash)
        titleLabel.sizeToFit()
        navigationItem.titleView = titleLabel
        return navigationItem
    }
    
    func makeTitleLabel() -> UILabel {
        let label = UILabel()
//        label.text = localizedString("Scan barcode")
        label.font = UIFont.boldSystemFont(ofSize: 17)
        label.textColor = .black
        label.numberOfLines = 1
        label.textAlignment = .center
        return label
    }
    
    func makeCloseButton() -> UIButton {
        let button = UIButton(type: .system)
        //    button.setTitle(localizedString("BUTTON_CLOSE"), for: UIControl.State())
        //button.setImage(UIImage(named: "ic_back-B"), for: .normal)
        if #available(iOS 13.0, *) {
            button.setImage(UIImage(systemName: "chevron.left"), for: .normal)
        } else {
            // Fallback on earlier versions
        }
        button.titleLabel?.font = UIFont.boldSystemFont(ofSize: 17)
        button.tintColor = .white
        return button
    }
    
    func makeFlashButton() -> UIButton{
        let button = UIButton()
        //button.setImage(UIImage(named: "TorchMode-Off"), for: .normal)
        if #available(iOS 13.0, *) {
            button.setImage(UIImage(systemName: "flashlight.off.fill"), for: .normal)
        } else {
            // Fallback on earlier versions
        }
        button.tintColor = .white
        return button
    }
}

// MARK: - UINavigationBarDelegate

extension HeaderViewController: UINavigationBarDelegate {
    public func position(for bar: UIBarPositioning) -> UIBarPosition {
        return .topAttached
    }
}
