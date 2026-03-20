//
//  FlashLightManager.swift
//  WebViewGold
//
//  Created by Laurence Trippen on 23.03.25.
//  Copyright © 2025 WebViewGold.com. All rights reserved.
//

import AVFoundation

class FlashLightManager {
  
  static func toggleTorch(on: Bool) -> Void {
    guard let device = AVCaptureDevice.default(for: AVMediaType.video) else { return }
    
    guard device.hasTorch else {
      print("[FlashLightManager] Torch isn't available")
      return
    }
    
    do {
      try device.lockForConfiguration()
      device.torchMode = on ? .on : .off
      
      // Set torch intensity to max.
      // TODO: Make intesity controllable via. parameter
      if on {
        do {
          try device.setTorchModeOn(level: min(AVCaptureDevice.maxAvailableTorchLevel, 1.0))
        } catch {
          print("[FlashLightManager] Torch intensity can't be set!")
        }
      }
      
      device.unlockForConfiguration()
    } catch {
      print("[FlashLightManager] Torch can't be used")
    }
  }
}
