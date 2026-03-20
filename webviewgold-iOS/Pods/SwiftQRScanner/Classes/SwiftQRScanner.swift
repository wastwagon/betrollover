//  SwiftQRScanner.swift
//  SwiftQRScanner
//
//  Original code created by Vinod Jagtap on 12/5/17.
//  Customized and enhanced in July 2024 with contribution of FindR.io team

import UIKit
import CoreGraphics
import AVFoundation

// QRScannerCodeDelegate Protocol
public protocol QRScannerCodeDelegate: class {
    func qrCodeScanningDidCompleteWithResult(result: String)
    func qrCodeScanningFailedWithError(error: String)
}

public class QRCodeScannerController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    
    var squareView: SquareView?
    public weak var delegate: QRScannerCodeDelegate?
    var cameraButton: UIButton = UIButton()
    
    // Default Properties
    let bottomSpace: CGFloat = 60.0
    var devicePosition: AVCaptureDevice.Position = .back
    open var qrScannerFrame: CGRect = CGRect.zero
    
    // Initialization part
    lazy var captureSession = AVCaptureSession()
    
    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        super.init(nibName: nil, bundle: nil)
    }
    
    required public init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override public func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Currently only "Portrait" mode is supported
        if #available(iOS 16.0, *) {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            for scene in scenes {
                scene.requestGeometryUpdate(UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .portrait)) { _ in }
            }
            scenes.flatMap { $0.windows }.first { $0.isKeyWindow }?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
        } else {
            UIDevice.current.setValue(UIInterfaceOrientation.portrait.rawValue, forKey: "orientation")
        }
        prepareQRScannerView(self.view)

        // Reset Zooming factor to 1.0 (again)
        if let defaultDevice = defaultDevice {
            do {
                try defaultDevice.lockForConfiguration()
                defaultDevice.videoZoomFactor = 1.0
                defaultDevice.unlockForConfiguration()
            } catch {
                print("Error while resetting Zoom factor: \(error)")
            }
        }

        startScanningQRCode()
    }
    
    override public func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    // Lazy initialization of properties
    lazy var defaultDevice: AVCaptureDevice? = {
        return AVCaptureDevice.default(for: .video)
    }()
    
    lazy var frontDevice: AVCaptureDevice? = {
        if #available(iOS 10, *) {
            return AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front)
        } else {
            for device in AVCaptureDevice.devices(for: .video) {
                if device.position == .front {
                    return device
                }
            }
        }
        return nil
    }()
    
    lazy var defaultCaptureInput: AVCaptureInput? = {
        if let captureDevice = defaultDevice {
            do {
                return try AVCaptureDeviceInput(device: captureDevice)
            } catch let error as NSError {
                print(error)
            }
        }
        return nil
    }()
    
    lazy var frontCaptureInput: AVCaptureInput?  = {
        if let captureDevice = frontDevice {
            do {
                return try AVCaptureDeviceInput(device: captureDevice)
            } catch let error as NSError {
                print(error)
            }
        }
        return nil
    }()
    
    lazy var dataOutput = AVCaptureMetadataOutput()
    
    lazy var videoPreviewLayer: AVCaptureVideoPreviewLayer = {
        let layer = AVCaptureVideoPreviewLayer(session: self.captureSession)
        layer.videoGravity = .resizeAspectFill
        layer.cornerRadius = 0.0
        return layer
    }()
    
    open func prepareQRScannerView(_ view: UIView) {
        qrScannerFrame = view.frame
        setupCaptureSession(devicePosition) // Default device capture position is back
        addVideoPreviewLayer(view)
        createCornerFrame()
        addButtons(view)
        let pinchGesture = UIPinchGestureRecognizer(target: self, action: #selector(pinchGestureHandler(_:))) // Attach a pinch gesture recognizer to the parent view
        view.addGestureRecognizer(pinchGesture)
    }
    
    @objc func pinchGestureHandler(_ gesture: UIPinchGestureRecognizer) {
        if gesture.state == .changed {
            let pinchZoomScale = gesture.scale
            let maxZoomFactor: CGFloat = 7.0 // Maximum zooming factor
            let currentZoomFactor = defaultDevice?.videoZoomFactor ?? 1.0
            let zoomFactorIncrement: CGFloat = 0.125 // Zooming speed factor

            var newZoomFactor: CGFloat
            if pinchZoomScale > 1.0 {
                newZoomFactor = min(currentZoomFactor + zoomFactorIncrement, maxZoomFactor)
            } else {
                newZoomFactor = max(currentZoomFactor - zoomFactorIncrement, 1.0)
            }

            // Apply the new zooming factor within the valid zoom range
            let clampedZoomFactor = min(maxZoomFactor, max(1.0, newZoomFactor))

            if let captureDevice = defaultDevice {
                do {
                    try captureDevice.lockForConfiguration()
                    captureDevice.videoZoomFactor = clampedZoomFactor
                    if captureDevice.isFocusModeSupported(.continuousAutoFocus) {
                        captureDevice.focusMode = .continuousAutoFocus
                    }
                    captureDevice.unlockForConfiguration()
                } catch let error as NSError {
                    print(error)
                }
            }
        }
    }
    
    private func createCornerFrame() {
        let screenRatioHeight = self.view.frame.height / 858.0
        let baseWidth: CGFloat = 161.6
        let baseHeight: CGFloat = 161.6
        let originX = (self.view.frame.width - baseWidth) / 2.0
        let originY = 258.0 * screenRatioHeight
        let rect = CGRect(origin: CGPoint(x: originX, y: originY), size: CGSize(width: baseWidth, height: baseHeight))
        self.squareView = SquareView(frame: rect)
        if let squareView = self.squareView {
            self.view.addSubview(squareView)
        }
    }
    
    var isTorchOn: Bool = false
    var torchButton: UIView!
    var closeButton: UIView!
    var torchIconImageView: UIImageView!
    
    private func createLocalizedString(for key: String) -> String {
        let currentLanguage = Locale.preferredLanguages.first?.prefix(2) ?? "en"
        let localizedStrings = [
            "close": ["en": "Close", "fr": "Fermer", "de": "Schließen", "es": "Cerrar", "ca": "Tancar", "pt": "Fechar"],
            "light": ["en": "Light", "fr": "Lampe", "de": "Licht", "es": "Luz", "ca": "Llum", "pt": "Luz"]
        ]
        // Check if the current language is supported, otherwise use English
        return localizedStrings[key]?[String(currentLanguage)] ?? localizedStrings[key]?["en"] ?? key
    }
    
    private func addButtons(_ view: UIView) {
        let buttonHeight: CGFloat = 48.0 // Increased size
        let buttonWidth: CGFloat = 100.0 // Increased size
        let padding: CGFloat = 20.0
        let verticalOffset: CGFloat = 67.0 // Distance from the bottom

        func createButton(withText text: String) -> UIView {
            let buttonBackground = UIView()
            buttonBackground.layer.backgroundColor = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1).cgColor
            buttonBackground.layer.cornerRadius = 25 // Adjusted for the new size
            
            let label = UILabel()
            label.textColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
            label.text = text
            label.textAlignment = .center
            
            buttonBackground.addSubview(label)
            label.translatesAutoresizingMaskIntoConstraints = false
            label.centerXAnchor.constraint(equalTo: buttonBackground.centerXAnchor).isActive = true
            label.centerYAnchor.constraint(equalTo: buttonBackground.centerYAnchor).isActive = true
            
            view.addSubview(buttonBackground)
            buttonBackground.translatesAutoresizingMaskIntoConstraints = false
            
            return buttonBackground
        }

        // Close Button Styling
        closeButton = createButton(withText: createLocalizedString(for: "close"))
        closeButton.setNeedsDisplay()
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.leftAnchor.constraint(equalTo: view.leftAnchor, constant: padding).isActive = true // Switch to left
        closeButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -verticalOffset).isActive = true
        closeButton.heightAnchor.constraint(equalToConstant: buttonHeight).isActive = true
        closeButton.widthAnchor.constraint(equalToConstant: 94).isActive = true
        closeButton.backgroundColor = UIColor.systemBlue
        closeButton.layer.cornerRadius = 10
        closeButton.layer.shadowColor = UIColor.black.cgColor
        closeButton.layer.shadowOffset = CGSize(width: 0, height: 2)
        closeButton.layer.shadowOpacity = 0.5
        closeButton.layer.shadowRadius = 4

        let closeTapGesture = UILongPressGestureRecognizer(target: self, action: #selector(handleCloseButtonTap(_:)))
        closeTapGesture.minimumPressDuration = 0
        closeTapGesture.cancelsTouchesInView = false
        closeButton.addGestureRecognizer(closeTapGesture)
        closeButton.isUserInteractionEnabled = true
        closeButton.layer.borderWidth = 0

        // Torch Button Styling
        torchButton = UIView()
        torchButton.translatesAutoresizingMaskIntoConstraints = false
        torchButton.backgroundColor = UIColor.systemGreen
        torchButton.layer.cornerRadius = 10
        torchButton.layer.shadowColor = UIColor.black.cgColor
        torchButton.layer.shadowOffset = CGSize(width: 0, height: 2)
        torchButton.layer.shadowOpacity = 0.5
        torchButton.layer.shadowRadius = 4

        view.addSubview(torchButton)
        torchButton.rightAnchor.constraint(equalTo: view.rightAnchor, constant: -padding).isActive = true
        torchButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -verticalOffset).isActive = true
        torchButton.heightAnchor.constraint(equalToConstant: buttonHeight).isActive = true
        torchButton.widthAnchor.constraint(equalToConstant: 102).isActive = true

        let torchTapGesture = UITapGestureRecognizer(target: self, action: #selector(toggleTorch))
        torchButton.addGestureRecognizer(torchTapGesture)
        torchButton.isUserInteractionEnabled = true
        torchButton.layer.borderWidth = 0

        // Add the torch icon and label in a stack view
        var torchIconImage = UIImage(named: "flashlight.on.fill")?.withRenderingMode(.alwaysTemplate)
        if #available(iOS 13.0, *) {
            torchIconImage = UIImage(systemName: "flashlight.on.fill")?.withRenderingMode(.alwaysTemplate)
        }
        torchIconImageView = UIImageView(image: torchIconImage)
        torchIconImageView.contentMode = .scaleAspectFit
        torchIconImageView.tintColor = UIColor.white

        let torchLabel = UILabel()
        torchLabel.textColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
        torchLabel.text = createLocalizedString(for: "light")
        torchLabel.textAlignment = .center

        let stackView = UIStackView(arrangedSubviews: [torchIconImageView, torchLabel])
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.spacing = 8

        torchButton.addSubview(stackView)
        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.centerXAnchor.constraint(equalTo: torchButton.centerXAnchor).isActive = true
        stackView.centerYAnchor.constraint(equalTo: torchButton.centerYAnchor).isActive = true
    }

    // Toggle torch
    @objc func toggleTorch() {
        // If device position is front then no need to torch
        if let currentInput = getCurrentInput() {
            if currentInput.device.position == .front {
                return
            }
        }
        
        guard let defaultDevice = defaultDevice else { return }
        if defaultDevice.isTorchAvailable {
            do {
                try defaultDevice.lockForConfiguration()
                defaultDevice.torchMode = defaultDevice.torchMode == .on ? .off : .on
                if #available(iOS 13.0, *) {
                    cameraButton.setImage(UIImage(systemName: defaultDevice.torchMode == .on ? "flashlight.on.fill" : "flashlight.off.fill"), for: .normal)
                }
                defaultDevice.unlockForConfiguration()
            } catch let error as NSError {
                print(error)
            }
        }
        isTorchOn.toggle() // Toggle the state
        updateButtonColorsForTorchState() // Update the button colors based on torch state
    }

    func updateButtonColorsForTorchState() {
        if isTorchOn {
            torchButton.layer.borderWidth = 0
            torchButton.backgroundColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
            (torchButton.subviews.first as? UILabel)?.textColor = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
            torchIconImageView.tintColor = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
        } else {
            torchButton.layer.borderWidth = 0
            torchButton.backgroundColor = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
            (torchButton.subviews.first as? UILabel)?.textColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
            torchIconImageView.tintColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
        }
    }

    @objc func handleCloseButtonTap(_ gesture: UILongPressGestureRecognizer) {
        switch gesture.state {
        case .began:
            // This is when the button is pressed
            closeButton.layer.borderWidth = 0
            closeButton.backgroundColor = UIColor(red: 1, green: 1, blue: 1, alpha: 1)
            (closeButton.subviews.first as? UILabel)?.textColor = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
            
        case .ended:
            // This is when the button is released
            closeButton.layer.borderWidth = 0
            closeButton.backgroundColor = UIColor(red: 0.09, green: 0.09, blue: 0.09, alpha: 1)
            dismissVC()

        default:
            break
        }
    }

    private func getCurrentInput() -> AVCaptureDeviceInput? {
        return captureSession.inputs.first as? AVCaptureDeviceInput
    }

    @objc func dismissVC() {
        // Turn off the torch if it's on
        if isTorchOn {
            guard let defaultDevice = defaultDevice, defaultDevice.isTorchAvailable else { return }
            do {
                try defaultDevice.lockForConfiguration()
                // Reset zoom factor to initial state
                defaultDevice.videoZoomFactor = 1.0
                if defaultDevice.torchMode == .on {
                    defaultDevice.torchMode = .off
                }
                defaultDevice.unlockForConfiguration()
            } catch let error as NSError {
                print(error)
            }
            isTorchOn = false
            updateButtonColorsForTorchState()
        }

        removeVideoPreviewLayer()
        self.dismiss(animated: false, completion: nil)
    }

    open func startScanningQRCode() {
        if captureSession.isRunning {
            return
        }
        
        DispatchQueue.global(qos: .userInitiated).async {
            self.captureSession.startRunning()
        }
    }

    private func setupCaptureSession(_ devicePosition: AVCaptureDevice.Position) {
        if captureSession.isRunning {
            return
        }
        captureSession.sessionPreset = .high
        
        switch devicePosition {
        case .front:
            if let frontDeviceInput = frontCaptureInput {
                if !captureSession.canAddInput(frontDeviceInput) {
                    delegate?.qrCodeScanningFailedWithError(error: "Failed to add Input")
                    return
                }
                captureSession.addInput(frontDeviceInput)
            }
        case .back, .unspecified:
            if let defaultDeviceInput = defaultCaptureInput {
                if !captureSession.canAddInput(defaultDeviceInput) {
                    delegate?.qrCodeScanningFailedWithError(error: "Failed to add Input")
                    return
                }
                captureSession.addInput(defaultDeviceInput)
                // Configure focus and exposure settings for the defaultDevice
                if let defaultDevice = defaultDevice {
                    do {
                        try defaultDevice.lockForConfiguration()
                        if defaultDevice.isFocusModeSupported(.continuousAutoFocus) {
                            defaultDevice.focusMode = .continuousAutoFocus
                        }
                        if defaultDevice.isExposureModeSupported(.continuousAutoExposure) {
                            defaultDevice.exposureMode = .continuousAutoExposure
                        }
                        defaultDevice.unlockForConfiguration()
                    } catch {
                        print("Error locking device for configuration: \(error)")
                    }
                }
            }
        default:
            print("Do nothing")
        }
        
        if !captureSession.canAddOutput(dataOutput) {
            delegate?.qrCodeScanningFailedWithError(error: "Failed to add Output")
            return
        }
        
        captureSession.addOutput(dataOutput)
        dataOutput.metadataObjectTypes = dataOutput.availableMetadataObjectTypes
        dataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
    }

    private func addVideoPreviewLayer(_ view: UIView) {
        videoPreviewLayer.frame = view.bounds
        view.layer.insertSublayer(videoPreviewLayer, at: 0)
    }

    private func removeVideoPreviewLayer() {
        videoPreviewLayer.removeFromSuperlayer()
    }

    // This method gets called when scanning is complete
    public func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        for data in metadataObjects {
            let transformed = videoPreviewLayer.transformedMetadataObject(for: data) as? AVMetadataMachineReadableCodeObject
            if let unwrapped = transformed, let stringValue = unwrapped.stringValue {
                let modifiedString = stringValue
                var allowedQRurls: [String] = [] // Define URL prefixes allowed to be scanned; if empty = all URL prefixes allowed

                // Function to check if the URL is allowed based on prefix
                func isURLAllowed(_ url: String) -> Bool {
                    // If allowedQRurls is empty, allow all URLs
                    if allowedQRurls.isEmpty {
                        return true
                    }
                    // Otherwise, check if the URL starts with any of the allowed URLs
                    for allowedURL in allowedQRurls {
                        if url.hasPrefix(allowedURL) {
                            return true
                        }
                    }
                    return false
                }

                // Check if the URL is allowed using the new logic
                if isURLAllowed(modifiedString) {
                    // Vibration feedback
                    let feedbackGenerator = UINotificationFeedbackGenerator()
                    feedbackGenerator.notificationOccurred(.success)
                    delegate?.qrCodeScanningDidCompleteWithResult(result: modifiedString)
                    captureSession.stopRunning()
                    removeVideoPreviewLayer()
                    self.dismiss(animated: false, completion: nil)
                } else {
                    delegate?.qrCodeScanningFailedWithError(error: "Scanned URL is not allowed")
                    squareView?.showErrorCorners()
                }
            } else {
                delegate?.qrCodeScanningFailedWithError(error: "Empty string found")
            }
        }
    }
}

// Currently Scanner supports only portrait mode.
extension QRCodeScannerController {
    // Make orientations to portrait
    override public var shouldAutorotate: Bool {
        return false
    }
    override public var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        return .portrait
    }
    
    override public var preferredInterfaceOrientationForPresentation: UIInterfaceOrientation {
        return .portrait
    }
}

// This class is for drawing corners of Square to show frame for scan QR code.
@IBDesignable
class SquareView: UIView {
    @IBInspectable
    var sizeMultiplier: CGFloat = 0.2 {
        didSet {
            self.setNeedsDisplay()
        }
    }
    @IBInspectable
    var lineWidth: CGFloat = 2.5 {
        didSet {
            self.setNeedsDisplay()
        }
    }
    
    @IBInspectable
    var lineColor: UIColor = UIColor.green {
        didSet {
            self.setNeedsDisplay()
        }
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        self.backgroundColor = UIColor.clear
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        self.backgroundColor = UIColor.clear
    }
    
    func drawCorners() {
        guard let currentContext = UIGraphicsGetCurrentContext() else { return }
        currentContext.setLineWidth(lineWidth)
        currentContext.setStrokeColor(lineColor.cgColor)
        
        // Top left corner
        currentContext.beginPath()
        currentContext.move(to: CGPoint(x: 0, y: 0))
        currentContext.addLine(to: CGPoint(x: self.bounds.size.width * sizeMultiplier, y: 0))
        currentContext.strokePath()
        
        // Top right corner
        currentContext.beginPath()
        currentContext.move(to: CGPoint(x: self.bounds.size.width - self.bounds.size.width * sizeMultiplier, y: 0))
        currentContext.addLine(to: CGPoint(x: self.bounds.size.width, y: 0))
        currentContext.addLine(to: CGPoint(x: self.bounds.size.width, y: self.bounds.size.height * sizeMultiplier))
        currentContext.strokePath()
        
        // Bottom right corner
        currentContext.beginPath()
        currentContext.move(to: CGPoint(x: self.bounds.size.width, y: self.bounds.size.height - self.bounds.size.height * sizeMultiplier))
        currentContext.addLine(to: CGPoint(x: self.bounds.size.width, y: self.bounds.size.height))
        currentContext.addLine(to: CGPoint(x: self.bounds.size.width - self.bounds.size.width * sizeMultiplier, y: self.bounds.size.height))
        currentContext.strokePath()
        
        // Bottom left corner
        currentContext.beginPath()
        currentContext.move(to: CGPoint(x: self.bounds.size.width * sizeMultiplier, y: self.bounds.size.height))
        currentContext.addLine(to: CGPoint(x: 0, y: self.bounds.size.height))
        currentContext.addLine(to: CGPoint(x: 0, y: self.bounds.size.height - self.bounds.size.height * sizeMultiplier))
        currentContext.strokePath()
        
        // Second part of top left corner
        currentContext.beginPath()
        currentContext.move(to: CGPoint(x: 0, y: self.bounds.size.height * sizeMultiplier))
        currentContext.addLine(to: CGPoint(x: 0, y: 0))
        currentContext.strokePath()
    }
    
    override func draw(_ rect: CGRect) {
        super.draw(rect)
        self.drawCorners()
    }
}

extension SquareView {
func showErrorCorners() {
self.lineColor = .red
DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
self.lineColor = .green
}
}
}
