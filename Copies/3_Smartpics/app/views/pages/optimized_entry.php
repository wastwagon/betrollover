<?php
/**
 * SmartPicks Pro - Optimized Entry Page
 * 
 * Clean, modern entry page without disclaimer section
 * Mobile-first design with red/white/green theme
 */

$pageTitle = 'SmartPicks Pro - Professional Football Betting Platform';

// Detect base path - only use /SmartPicksPro-Local for local development
$basePath = '';
$host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
$isLocalhost = strpos($host, 'localhost') !== false || strpos($host, '127.0.0.1') !== false;

// Only use base path on localhost AND if the path actually contains it
// Never use base path on production domains
if ($isLocalhost && isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/SmartPicksPro-Local') !== false) {
    $basePath = '/SmartPicksPro-Local';
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --primary-red: #DC2626;
            --primary-green: #059669;
            --primary-white: #FFFFFF;
            --light-gray: #F8F9FA;
            --dark-gray: #6B7280;
            --border-gray: #E5E7EB;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background: var(--primary-white);
        }

        .hero-section {
            min-height: 100vh;
            display: flex;
            align-items: center;
            background: linear-gradient(135deg, var(--primary-white) 0%, var(--light-gray) 100%);
            position: relative;
            overflow: hidden;
        }

        .hero-section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="%23E5E7EB" stroke-width="0.5"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
            opacity: 0.3;
        }

        .hero-content {
            position: relative;
            z-index: 2;
        }

        .logo-container {
            text-align: center;
            margin-bottom: 3rem;
        }

        .logo-icon {
            width: 80px;
            height: 80px;
            background: var(--primary-red);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
            box-shadow: 0 10px 25px rgba(220, 38, 38, 0.2);
        }

        .logo-icon i {
            font-size: 2.5rem;
            color: var(--primary-white);
        }

        .brand-title {
            font-size: 3rem;
            font-weight: 800;
            color: var(--primary-red);
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }

        .brand-subtitle {
            font-size: 1.25rem;
            color: var(--dark-gray);
            font-weight: 500;
        }

        .welcome-section {
            margin-bottom: 4rem;
        }

        .welcome-title {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 1.5rem;
            text-align: center;
        }

        .welcome-description {
            font-size: 1.125rem;
            color: var(--dark-gray);
            text-align: center;
            max-width: 600px;
            margin: 0 auto 3rem;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 4rem;
        }

        .feature-card {
            background: var(--primary-white);
            border: 1px solid var(--border-gray);
            border-radius: 16px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 25px rgba(0, 0, 0, 0.1);
            border-color: var(--primary-red);
        }

        .feature-icon {
            width: 60px;
            height: 60px;
            background: var(--primary-red);
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
        }

        .feature-icon i {
            font-size: 1.5rem;
            color: var(--primary-white);
        }

        .feature-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1F2937;
            margin-bottom: 0.75rem;
        }

        .feature-description {
            color: var(--dark-gray);
            font-size: 0.95rem;
        }

        .cta-section {
            text-align: center;
            margin-top: 3rem;
        }

        .btn-primary-custom {
            background: var(--primary-red);
            border: none;
            color: var(--primary-white);
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.125rem;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
        }

        .btn-primary-custom:hover {
            background: #B91C1C;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
            color: var(--primary-white);
        }

        .btn-secondary-custom {
            background: var(--primary-white);
            border: 2px solid var(--primary-red);
            color: var(--primary-red);
            padding: 1rem 2rem;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1.125rem;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            margin-left: 1rem;
        }

        .btn-secondary-custom:hover {
            background: var(--primary-red);
            color: var(--primary-white);
            transform: translateY(-2px);
        }
        
        /* Benefits Section */
        .benefits-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .benefit-card {
            background: var(--primary-white);
            border: 1px solid var(--border-gray);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .benefit-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
            border-color: var(--primary-red);
        }
        
        .benefit-card.highlight-card {
            background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
            border: 2px solid var(--primary-red);
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.15);
        }
        
        .benefit-card.highlight-card:hover {
            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.25);
        }
        
        .benefit-icon {
            width: 60px;
            height: 60px;
            background: var(--primary-red);
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.5rem;
        }
        
        .benefit-card.highlight-card .benefit-icon {
            background: var(--primary-red);
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        }
        
        .benefit-icon i {
            font-size: 1.75rem;
            color: var(--primary-white);
        }
        
        .benefit-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--primary-red);
            margin-bottom: 1rem;
        }
        
        .benefit-description {
            color: var(--dark-gray);
            font-size: 0.95rem;
            line-height: 1.6;
        }
        
        .benefit-description strong {
            color: var(--primary-red);
            font-weight: 700;
        }
        
        /* How It Works Section */
        .how-it-works-section {
            margin-bottom: 3rem;
        }
        
        .section-title {
            font-size: 2rem;
            font-weight: 700;
            color: #1F2937;
            text-align: center;
            margin-bottom: 2.5rem;
        }
        
        .steps-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
        }
        
        .step-card {
            background: var(--primary-white);
            border: 1px solid var(--border-gray);
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            position: relative;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        
        .step-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
            border-color: var(--primary-red);
        }
        
        .step-number {
            width: 60px;
            height: 60px;
            background: var(--primary-red);
            color: var(--primary-white);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
            font-weight: 800;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);
        }
        
        .step-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #1F2937;
            margin-bottom: 1rem;
        }
        
        .step-description {
            color: var(--dark-gray);
            font-size: 0.95rem;
            line-height: 1.6;
        }


        /* Mobile Optimizations */
        @media (max-width: 768px) {
            .brand-title {
                font-size: 2.5rem;
            }

            .welcome-title {
                font-size: 2rem;
            }

            .features-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }

            .feature-card {
                padding: 1.5rem;
            }

            .btn-secondary-custom {
                margin-left: 0;
                margin-top: 1rem;
                display: block;
            }
            
            .benefits-section {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .benefit-card {
                padding: 1.5rem;
            }
            
            .how-it-works-section {
                margin-bottom: 2rem;
            }
            
            .section-title {
                font-size: 1.75rem;
            }
            
            .steps-grid {
                grid-template-columns: 1fr;
                gap: 1.5rem;
            }
            
            .step-card {
                padding: 1.5rem;
            }

        }

        @media (max-width: 480px) {
            .brand-title {
                font-size: 2rem;
            }

            .welcome-title {
                font-size: 1.75rem;
            }

        }
    </style>
</head>
<body>
    <div class="hero-section">
        <div class="container">
            <div class="hero-content">
                <!-- Logo and Brand -->
                <div class="logo-container">
                    <div class="logo-icon">
                        <i class="fas fa-futbol"></i>
                    </div>
                    <h1 class="brand-title">BetRollover</h1>
                    <p class="brand-subtitle">Risk-Free Professional Football Betting Platform</p>
                </div>

                <!-- Welcome Section -->
                <div class="welcome-section">
                    <h2 class="welcome-title">Welcome to BetRollover!</h2>
                    <p class="welcome-description">
                        Your trusted platform for professional football betting tips. Access expert picks from verified tipsters and grow your betting portfolio with confidence.
                    </p>
                </div>
                
                <!-- Platform Benefits Section -->
                <div class="benefits-section">
                    <div class="benefit-card highlight-card">
                        <div class="benefit-icon">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <h3 class="benefit-title">Risk-Free Guarantee</h3>
                        <p class="benefit-description">
                            <strong>You don't lose if a pick loses!</strong> Your funds are protected. We use an escrow system that ensures your money is safe. If a pick doesn't win, you get your purchase amount back.
                        </p>
                    </div>
                    
                    <div class="benefit-card">
                        <div class="benefit-icon">
                            <i class="fas fa-lock"></i>
                        </div>
                        <h3 class="benefit-title">Secure Escrow System</h3>
                        <p class="benefit-description">
                            All purchases are held in secure escrow until pick settlement. Funds are only released to tipsters when picks win, protecting your investment.
                        </p>
                    </div>
                    
                    <div class="benefit-card">
                        <div class="benefit-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <h3 class="benefit-title">Verified Tipsters</h3>
                        <p class="benefit-description">
                            All tipsters are verified and qualified. Only proven performers with track records can sell picks on our platform.
                        </p>
                    </div>
                    
                    <div class="benefit-card">
                        <div class="benefit-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="benefit-title">Transparent Performance</h3>
                        <p class="benefit-description">
                            View tipster win rates, performance history, and track records before making any purchase decision.
                        </p>
                    </div>
                </div>

                <!-- How It Works Section -->
                <div class="how-it-works-section">
                    <h2 class="section-title">How It Works</h2>
                    <div class="steps-grid">
                        <div class="step-card">
                            <div class="step-number">1</div>
                            <h3 class="step-title">Browse Marketplace</h3>
                            <p class="step-description">
                                Explore picks from verified tipsters. View win rates, performance history, and detailed analysis before making a decision.
                            </p>
                        </div>
                        
                        <div class="step-card">
                            <div class="step-number">2</div>
                            <h3 class="step-title">Purchase Pick</h3>
                            <p class="step-description">
                                Buy picks that match your strategy. Your funds are held securely in escrow until settlement, ensuring complete protection.
                            </p>
                        </div>
                        
                        <div class="step-card">
                            <div class="step-number">3</div>
                            <h3 class="step-title">Get Results</h3>
                            <p class="step-description">
                                <strong>If the pick wins:</strong> You receive your winnings and the tipster gets paid.<br>
                                <strong>If the pick loses:</strong> You get a full refund - no risk to you!
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Features Section -->
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <h3 class="feature-title">Live Performance Tracking</h3>
                        <p class="feature-description">
                            Monitor your betting performance with real-time analytics and detailed statistics.
                        </p>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <h3 class="feature-title">Expert Tipster Community</h3>
                        <p class="feature-description">
                            Connect with verified tipsters and share insights with our global community.
                        </p>
                    </div>

                    <div class="feature-card">
                        <div class="feature-icon">
                            <i class="fas fa-trophy"></i>
                        </div>
                        <h3 class="feature-title">Proven Win Rates</h3>
                        <p class="feature-description">
                            Access high-quality tips from top-performing tipsters with verified track records.
                        </p>
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="cta-section">
                    <a href="<?= $basePath ?>/login" class="btn-primary-custom">
                        <i class="fas fa-sign-in-alt"></i> Login to Dashboard
                    </a>
                    <a href="<?= $basePath ?>/register" class="btn-secondary-custom">
                        <i class="fas fa-user-plus"></i> Create Account
                    </a>
                </div>
            </div>
        </div>
    </div>


    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
