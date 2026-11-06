"""
generate_documentation_pdfs.py - Generates pin_map.pdf and circuit_diagram.pdf
using Pillow with clean vector-like layout and typography.
"""

from PIL import Image, ImageDraw, ImageFont
import os

DOC_DIR = os.path.dirname(os.path.abspath(__file__))

def create_pin_map_pdf():
    # A4 Portrait at 150 DPI: 1240 x 1754 px
    W, H = 1240, 1754
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # Use default font or truetype
    try:
        font_title = ImageFont.truetype("arial.ttf", 36)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_h2 = ImageFont.truetype("arial.ttf", 24)
        font_body = ImageFont.truetype("arial.ttf", 16)
        font_mono = ImageFont.truetype("consolab.ttf", 15)
        font_small = ImageFont.truetype("arial.ttf", 13)
    except Exception:
        font_title = font_sub = font_h2 = font_body = font_mono = font_small = ImageFont.load_default()

    # Header Top Bar
    draw.rectangle([50, 40, W - 50, 48], fill="#00a8b5")
    draw.text((50, 60), "UIU RESCUE ROVER TEAM (#URRT)", fill="#00a8b5", font=font_title)
    draw.text((50, 105), "HARDWARE GPIO PINOUT & INTERFACE SPECIFICATION", fill="#475569", font=font_sub)
    draw.rectangle([W - 320, 65, W - 50, 95], fill="#f1f5f9", outline="#cbd5e1")
    draw.text((W - 310, 72), "URRT-PINMAP-V1.3 • TABLE 7", fill="#0f172a", font=font_mono)

    # Compliance Box
    draw.rounded_rectangle([50, 145, W - 50, 205], radius=6, fill="#f0fdfa", outline="#00a8b5", width=2)
    draw.text((70, 155), "URRT Rulebook Table 7 Compliance Mandate:", fill="#0f766e", font=font_mono)
    draw.text((70, 175), "Dedicated optical isolation or logic level shifting between 5V sensors and 3.3V ESP32 logic.", fill="#334155", font=font_body)

    # Table 1: ESP32 Pinout
    draw.text((50, 225), "1. ESP32-WROOM-32 Primary Controller Pinout", fill="#0f172a", font=font_h2)
    draw.line([50, 255, W - 50, 255], fill="#cbd5e1", width=2)

    headers = ["GPIO PIN", "SIGNAL NAME", "TARGET SUBSYSTEM", "TYPE", "VOLTAGE", "TABLE 7 ROLE"]
    col_x = [60, 180, 400, 660, 800, 930]
    y = 270

    # Table Header Row
    draw.rectangle([50, y - 5, W - 50, y + 25], fill="#0f172a")
    for i, h in enumerate(headers):
        draw.text((col_x[i], y), h, fill="#ffffff", font=font_mono)
    y += 32

    pins = [
        ("GPIO 4", "ESTOP_INT", "Hardware E-Stop Switch", "INTERRUPT", "3.3V (Pull-up)", "Hard Cutoff / Failsafe (5m)"),
        ("GPIO 5", "SONAR_TRIG", "HC-SR04 / JSN-SR04T", "OUTPUT", "3.3V", "10us ultrasonic pulse"),
        ("GPIO 18", "SONAR_ECHO", "HC-SR04 / JSN-SR04T", "INPUT", "3.3V (Divider)", "Stop Zone: 80-120mm (15m)"),
        ("GPIO 14", "LEFT_PWM", "BTS7960 / L298N", "PWM (20kHz)", "3.3V / 5V Logic", "Left Track Speed (0-255)"),
        ("GPIO 27", "LEFT_DIR", "BTS7960 / L298N", "OUTPUT", "3.3V / 5V Logic", "Left Direction Control"),
        ("GPIO 26", "RIGHT_PWM", "BTS7960 / L298N", "PWM (20kHz)", "3.3V / 5V Logic", "Right Track Speed (0-255)"),
        ("GPIO 25", "RIGHT_DIR", "BTS7960 / L298N", "OUTPUT", "3.3V / 5V Logic", "Right Direction Control"),
        ("GPIO 21", "I2C_SDA", "MPU-6050 / BNO055", "I2C DATA", "3.3V", "Fast-Mode 400kHz I2C Bus"),
        ("GPIO 22", "I2C_SCL", "MPU-6050 / BNO055", "I2C CLOCK", "3.3V", "Attitude & Tilt Danger"),
        ("GPIO 34", "ENC_LEFT", "Optical Wheel Encoder", "INTERRUPT", "3.3V", "Odometry & Distance mm"),
        ("GPIO 35", "ENC_RIGHT", "Optical Wheel Encoder", "INTERRUPT", "3.3V", "Odometry & Speed mm/s"),
        ("GPIO 12", "LED_AUTO", "Autonomous Status LED", "OUTPUT", "3.3V", "Lit when Auto Lock Active (20m)"),
        ("GPIO 13", "LED_TELEOP", "Teleoperation LED", "OUTPUT", "3.3V", "Lit in Teleop Mode (x1)"),
        ("GPIO 2", "AUDIO_DAC", "PAM8403 Amplifier", "DAC / PWM", "3.3V", "Two-Way Audio Acuity (15m)"),
    ]

    for idx, row in enumerate(pins):
        bg = "#f8fafc" if idx % 2 == 1 else "#ffffff"
        draw.rectangle([50, y - 4, W - 50, y + 26], fill=bg)
        for i, val in enumerate(row):
            col = "#0f172a" if i > 0 else "#00a8b5"
            draw.text((col_x[i], y + 2), str(val), fill=col, font=font_body if i != 0 else font_mono)
        y += 30

    y += 20
    # Table 2: Single Board Computer Vision Rig
    draw.text((50, y), "2. Single Board Computer (Raspberry Pi 4 / 5 / Jetson) Vision Rig", fill="#0f172a", font=font_h2)
    draw.line([50, y + 30, W - 50, y + 30], fill="#cbd5e1", width=2)
    y += 45

    sbc_headers = ["PORT / PIN", "INTERFACE", "CONNECTED DEVICE", "TABLE 7 MISSION CRITERION"]
    sbc_cols = [60, 260, 520, 800]
    draw.rectangle([50, y - 5, W - 50, y + 25], fill="#0f172a")
    for i, h in enumerate(sbc_headers):
        draw.text((sbc_cols[i], y), h, fill="#ffffff", font=font_mono)
    y += 32

    sbc_rows = [
        ("USB 3.0 (Bus 1)", "UVC Video 1080p 30fps", "Primary Mast Camera", "Live Multi-Cam Stream & QR Decode (10m)"),
        ("USB 3.0 (Bus 2)", "UVC Video 1080p 30fps", "Chassis Tool Camera", "Colour & Shape Analysis, 5s Motion (15m)"),
        ("UART (Pin 8/10)", "Serial 115200 Baud", "ESP32 Core Telemetry Link", "<= 100ms Polling Latency Benchmark (10m)"),
        ("Ethernet / Wi-Fi", "TCP / WS Port 5000", "Ground Control Cockpit", "Zero-Latency Teleoperation & Video WebRTC"),
    ]

    for idx, row in enumerate(sbc_rows):
        bg = "#f8fafc" if idx % 2 == 1 else "#ffffff"
        draw.rectangle([50, y - 4, W - 50, y + 26], fill=bg)
        for i, val in enumerate(row):
            draw.text((sbc_cols[i], y + 2), str(val), fill="#0f172a", font=font_body if i != 0 else font_mono)
        y += 30

    # Footer
    draw.line([50, H - 70, W - 50, H - 70], fill="#cbd5e1", width=1)
    draw.text((50, H - 55), "UIU Rescue Rover Team (#URRT) • Department of Computer Science & Engineering", fill="#94a3b8", font=font_small)
    draw.text((W - 220, H - 55), "Page 1 of 1 • System Pin Map", fill="#94a3b8", font=font_small)

    out_path = os.path.join(DOC_DIR, "pin_map.pdf")
    img.save(out_path, "PDF", resolution=150.0)
    print("Created:", out_path)

def create_circuit_diagram_pdf():
    # A4 Landscape at 150 DPI: 1754 x 1240 px
    W, H = 1754, 1240
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 34)
        font_sub = ImageFont.truetype("arial.ttf", 20)
        font_h2 = ImageFont.truetype("arial.ttf", 22)
        font_body = ImageFont.truetype("arial.ttf", 15)
        font_mono = ImageFont.truetype("consolab.ttf", 14)
        font_bold = ImageFont.truetype("arialbd.ttf", 16)
        font_small = ImageFont.truetype("arial.ttf", 12)
    except Exception:
        font_title = font_sub = font_h2 = font_body = font_mono = font_bold = font_small = ImageFont.load_default()

    # Header
    draw.rectangle([50, 30, W - 50, 38], fill="#00a8b5")
    draw.text((50, 48), "UIU RESCUE ROVER TEAM (#URRT)", fill="#00a8b5", font=font_title)
    draw.text((50, 90), "ELECTRICAL SYSTEM POWER ARCHITECTURE & SCHEMATIC", fill="#475569", font=font_sub)
    draw.rectangle([W - 350, 50, W - 50, 80], fill="#f1f5f9", outline="#cbd5e1")
    draw.text((W - 340, 58), "URRT-SCHEMATIC-V1.3 • TABLE 7", fill="#0f172a", font=font_mono)

    # Schematic Canvas Box
    draw.rounded_rectangle([50, 130, W - 50, H - 200], radius=8, fill="#fafbfc", outline="#cbd5e1", width=2)

    # Draw Component Blocks
    # 1. 12V LiPo Battery
    draw.rounded_rectangle([80, 360, 260, 490], radius=6, fill="#fef2f2", outline="#dc2626", width=3)
    draw.text((100, 380), "11.1V / 12V LiPo", fill="#991b1b", font=font_bold)
    draw.text((100, 410), "3S 5200mAh 45C", fill="#b91c1c", font=font_body)
    draw.text((100, 435), "Max 230A Discharge", fill="#475569", font=font_small)
    draw.text((100, 460), "XT60 High-Amp Plug", fill="#dc2626", font=font_mono)

    # Fuse
    draw.rounded_rectangle([310, 395, 410, 455], radius=4, fill="#ffffff", outline="#d97706", width=2)
    draw.text((335, 405), "FUSE", fill="#b45309", font=font_bold)
    draw.text((345, 430), "30A", fill="#78350f", font=font_mono)

    # Emergency Stop
    draw.rounded_rectangle([460, 385, 590, 465], radius=6, fill="#fee2e2", outline="#ef4444", width=3)
    draw.ellipse([505, 395, 545, 435], fill="#dc2626")
    draw.text((512, 407), "STOP", fill="#ffffff", font=font_bold)
    draw.text((490, 442), "E-STOP BUTTON", fill="#991b1b", font=font_mono)

    # Connections to E-Stop
    draw.line([260, 425, 310, 425], fill="#dc2626", width=4)
    draw.line([410, 425, 460, 425], fill="#dc2626", width=4)
    draw.line([590, 425, 660, 425], fill="#dc2626", width=4)

    # Distribution Bus
    draw.line([660, 425, 660, 220], fill="#dc2626", width=4)
    draw.line([660, 425, 660, 630], fill="#dc2626", width=4)

    # Branch 1: High Current Motor Driver (12V)
    draw.line([660, 220, 740, 220], fill="#dc2626", width=4)
    draw.rounded_rectangle([740, 160, 1020, 280], radius=6, fill="#eff6ff", outline="#2563eb", width=2)
    draw.text((760, 175), "BTS7960 / L298N DUAL H-BRIDGE", fill="#1e40af", font=font_bold)
    draw.text((760, 205), "Operating Voltage: 12V Main Bus", fill="#3b82f6", font=font_body)
    draw.text((760, 230), "Continuous: 2× 43A Peak Capacity", fill="#475569", font=font_small)
    draw.text((760, 255), "Hardware Drive Interlock Enabled", fill="#1d4ed8", font=font_mono)

    # 4x Motors Block
    draw.line([1020, 220, 1100, 220], fill="#2563eb", width=3)
    draw.rounded_rectangle([1100, 160, 1340, 280], radius=6, fill="#f8fafc", outline="#3b82f6", width=2)
    draw.text((1120, 180), "4× PLANETARY MOTORS", fill="#1e3a8a", font=font_bold)
    draw.text((1120, 210), "12V Metal Gearbox 200 RPM", fill="#334155", font=font_body)
    draw.text((1120, 235), "Differential Steering (WASD)", fill="#475569", font=font_small)
    draw.text((1120, 255), "Dual Wheel Encoders (360 t)", fill="#2563eb", font=font_mono)

    # Branch 2: Buck Converter 1 (12V -> 5V 5A for SBC)
    draw.line([660, 425, 740, 425], fill="#dc2626", width=4)
    draw.rounded_rectangle([740, 365, 1020, 485], radius=6, fill="#f0fdf4", outline="#16a34a", width=2)
    draw.text((760, 380), "BUCK CONVERTER 1 (XL4015)", fill="#15803d", font=font_bold)
    draw.text((760, 410), "Input: 12V → Output: 5.1V @ 5A", fill="#16a34a", font=font_body)
    draw.text((760, 435), "High Efficiency Synchronous Step-Down", fill="#475569", font=font_small)
    draw.text((760, 460), "Isolated Logic Rail for Video SBC", fill="#166534", font=font_mono)

    # Vision SBC Block
    draw.line([1020, 425, 1100, 425], fill="#16a34a", width=3)
    draw.rounded_rectangle([1100, 365, 1340, 485], radius=6, fill="#ecfdf5", outline="#059669", width=2)
    draw.text((1120, 380), "RASPBERRY PI 4 / SBC", fill="#065f46", font=font_bold)
    draw.text((1120, 410), "AI Vision: QR, Color & Shape", fill="#047857", font=font_body)
    draw.text((1120, 435), "5-Second Continuous Motion Tracker", fill="#475569", font=font_small)
    draw.text((1120, 460), "WebSocket ≤100ms Bus Server", fill="#0f766e", font=font_mono)

    # Branch 3: Buck Converter 2 (12V -> 5V 3A for ESP32 & Sensors)
    draw.line([660, 630, 740, 630], fill="#dc2626", width=4)
    draw.rounded_rectangle([740, 570, 1020, 690], radius=6, fill="#fffbeb", outline="#d97706", width=2)
    draw.text((760, 585), "BUCK CONVERTER 2 (LM2596)", fill="#b45309", font=font_bold)
    draw.text((760, 615), "Input: 12V → Output: 5.0V @ 3A", fill="#d97706", font=font_body)
    draw.text((760, 640), "LC Low-Pass Ripple Filter Bank", fill="#475569", font=font_small)
    draw.text((760, 665), "Low-Noise Sensor Power Rail", fill="#92400e", font=font_mono)

    # ESP32 Core MCU Block
    draw.line([1020, 630, 1100, 630], fill="#d97706", width=3)
    draw.rounded_rectangle([1100, 570, 1340, 690], radius=6, fill="#fdf4ff", outline="#a855f7", width=2)
    draw.text((1120, 585), "ESP32 CORE MCU & SENSORS", fill="#6b21a8", font=font_bold)
    draw.text((1120, 615), "HC-SR04 Sonar (Target 80-120mm)", fill="#7e22ce", font=font_body)
    draw.text((1120, 640), "MPU-6050 6-Axis IMU (I2C Bus)", fill="#475569", font=font_small)
    draw.text((1120, 665), "PAM8403 Two-Way Audio Amp", fill="#581c87", font=font_mono)

    # Interconnect Lines
    # UART between SBC and ESP32
    draw.line([1220, 485, 1220, 570], fill="#00a8b5", width=3)
    draw.rectangle([1230, 515, 1380, 545], fill="#ffffff", outline="#00a8b5")
    draw.text((1240, 523), "UART TX/RX (<=100ms)", fill="#00a8b5", font=font_mono)

    # PWM & DIR between ESP32 and Motor Driver
    draw.line([1020, 610, 1050, 610], fill="#8b5cf6", width=2)
    draw.line([1050, 610, 1050, 270], fill="#8b5cf6", width=2)
    draw.line([1050, 270, 1020, 270], fill="#8b5cf6", width=2)
    draw.rectangle([1025, 430, 1090, 460], fill="#ffffff", outline="#8b5cf6")
    draw.text((1032, 438), "PWM/DIR", fill="#6d28d9", font=font_mono)

    # Common Star Ground Rail
    draw.line([120, 520, 120, 740], fill="#334155", width=4)
    draw.line([120, 740, 1650, 740], fill="#334155", width=4)
    draw.text((800, 755), "COMMON STAR-GROUND JUNCTION (PREVENTS MOTOR BACK-EMF & GROUND LOOPS)", fill="#334155", font=font_mono)

    # Ground drops
    for gx in [880, 1220]:
        draw.line([gx, 690, gx, 740], fill="#334155", width=2)

    # Technical Notes at bottom
    draw.line([50, H - 180, W - 50, H - 180], fill="#cbd5e1", width=1)
    notes = [
        ("1. OVERCURRENT & E-STOP (5 Marks)", "30A main fuse protects against motor stall shorts. The physical emergency stop mushroom button cuts battery power to both buck converters and the H-bridge drivers instantly."),
        ("2. DUAL ISOLATED STEP-DOWN RAILS", "Separate step-down converters prevent motor voltage transients and electromagnetic noise from corrupting sensitive camera vision streams and I2C IMU bus readings."),
        ("3. STAR GROUND TOPOLOGY", "All high-current motor grounds and low-power logic grounds converge at a single chassis star-ground junction to prevent ground loops and false sensor readings."),
    ]
    col_w = (W - 120) // 3
    for idx, (title, text) in enumerate(notes):
        nx = 60 + idx * (col_w + 20)
        draw.text((nx, H - 165), title, fill="#0f172a", font=font_bold)
        # Wrap text simply
        draw.text((nx, H - 140), text[:65], fill="#475569", font=font_small)
        draw.text((nx, H - 122), text[65:135], fill="#475569", font=font_small)
        draw.text((nx, H - 104), text[135:205], fill="#475569", font=font_small)

    # Footer
    draw.line([50, H - 45, W - 50, H - 45], fill="#cbd5e1", width=1)
    draw.text((50, H - 32), "UIU Rescue Rover Team (#URRT) • Department of Computer Science & Engineering", fill="#94a3b8", font=font_small)
    draw.text((W - 250, H - 32), "Page 1 of 1 • Electrical Schematic", fill="#94a3b8", font=font_small)

    out_path = os.path.join(DOC_DIR, "circuit_diagram.pdf")
    img.save(out_path, "PDF", resolution=150.0)
    print("Created:", out_path)

if __name__ == "__main__":
    create_pin_map_pdf()
    create_circuit_diagram_pdf()
