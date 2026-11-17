with open("app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

# Replace topbar background
css = css.replace("/* 1. Header (Sky Blue) */\n.ref-topbar {\n  background: #0088cc;", 
                  "/* 1. Header (Emerald Green) */\n.ref-topbar {\n  background: #126e51;\n  border-bottom: 2px solid #00c278;")

# Replace top nav strip
css = css.replace(".ref-navstrip {\n  background: #1e293b;", 
                  ".ref-navstrip {\n  background: #121b24;")
css = css.replace(".ref-nav-item:hover {\n  background: #0f172a;\n  color: #ffffff;",
                  ".ref-nav-item:hover {\n  background: #1a2530;\n  color: #00c278;")

# Replace ticker bar
css = css.replace(".ref-ticker-bar {\n  background: #2b3a4a;",
                  ".ref-ticker-bar {\n  background: #1a2530;")
css = css.replace(".ref-ticker-chip {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  background: #1e293b;",
                  ".ref-ticker-chip {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  background: #121b24;\n  border: 1px solid rgba(0, 194, 120, 0.25);")

# Replace sidebar card header
css = css.replace(".ref-card-header {\n  background: #0088cc;",
                  ".ref-card-header {\n  background: #126e51;\n  border-bottom: 1px solid #094734;")

# Replace sidebar links and icons
css = css.replace(".ref-side-link:hover {\n  background: #f8fafc;\n  color: #0088cc;",
                  ".ref-side-link:hover {\n  background: #f0fdf4;\n  color: #126e51;")
css = css.replace(".ref-tree-icon {\n  font-family: monospace;\n  font-weight: 700;\n  color: #0088cc;",
                  ".ref-tree-icon {\n  font-family: monospace;\n  font-weight: 700;\n  color: #059669;")

# Replace sport tabs active
css = css.replace(".ref-sport-tab-btn.active {\n  background: #1e293b;\n  color: #ffffff;\n  border-color: #1e293b;",
                  ".ref-sport-tab-btn.active {\n  background: #126e51;\n  color: #ffffff;\n  border-color: #126e51;")

# Replace match name hover
css = css.replace(".ref-match-name:hover {\n  color: #0088cc;",
                  ".ref-match-name:hover {\n  color: #126e51;")
css = css.replace(".ref-match-sport-tag {\n  font-weight: 700;\n  color: #0284c7;",
                  ".ref-match-sport-tag {\n  font-weight: 700;\n  color: #059669;")

# Replace provider card hover
css = css.replace(".ref-provider-chip-card:hover {\n  border-color: #0088cc;\n  background: #f0f9ff;",
                  ".ref-provider-chip-card:hover {\n  border-color: #126e51;\n  background: #f0fdf4;")

# Replace footer link hover
css = css.replace(".ref-footer-links a:hover {\n  text-decoration: underline;\n  color: #0088cc;",
                  ".ref-footer-links a:hover {\n  text-decoration: underline;\n  color: #126e51;")

# Replace betslip
css = css.replace(".ref-betslip-dock {\n  position: fixed;\n  bottom: 20px;\n  right: 20px;\n  width: 360px;\n  max-width: 90vw;\n  background: #ffffff;\n  border: 2px solid #0088cc;",
                  ".ref-betslip-dock {\n  position: fixed;\n  bottom: 20px;\n  right: 20px;\n  width: 360px;\n  max-width: 90vw;\n  background: #ffffff;\n  border: 2px solid #126e51;")
css = css.replace(".ref-btn-place-bet {\n  background: #0088cc;",
                  ".ref-btn-place-bet {\n  background: #126e51;\n  box-shadow: 0 2px 6px rgba(18, 110, 81, 0.35);")
css = css.replace(".ref-btn-place-bet:hover {\n  background: #0077b5;",
                  ".ref-btn-place-bet:hover {\n  background: #0e5b42;")
css = css.replace(".ref-max-chip {\n  background: #e0f2fe;\n  color: #0369a1;\n  border-color: #7dd3fc;",
                  ".ref-max-chip {\n  background: #d1fae5;\n  color: #047857;\n  border-color: #6ee7b7;")

# Replace menu item hover
css = css.replace(".ref-menu-item:hover {\n  background: #f1f5f9;\n  text-decoration: none;\n  color: #0088cc;",
                  ".ref-menu-item:hover {\n  background: #f0fdf4;\n  text-decoration: none;\n  color: #126e51;")

# Replace search focus
css = css.replace(".ref-filter-input:focus {\n  border-color: #0088cc !important;",
                  ".ref-filter-input:focus {\n  border-color: #126e51 !important;")
css = css.replace(".ref-stake-input:focus {\n  border-color: #0088cc !important;",
                  ".ref-stake-input:focus {\n  border-color: #126e51 !important;")

# Replace login styles
css = css.replace(".login-page-root {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: radial-gradient(circle at top, #1e293b 0%, #0f172a 60%, #080d1a 100%);",
                  ".login-page-root {\n  min-height: 100vh;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background: radial-gradient(circle at top, #0f2d22 0%, #0d171d 60%, #080d11 100%);")
css = css.replace(".login-brand-emblem-wrap {\n  width: 52px;\n  height: 52px;\n  margin: 0 auto 12px;\n  background: linear-gradient(135deg, #0088cc, #0284c7);\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 6px 16px rgba(0, 136, 204, 0.35);",
                  ".login-brand-emblem-wrap {\n  width: 52px;\n  height: 52px;\n  margin: 0 auto 12px;\n  background: linear-gradient(135deg, #10b981, #059669);\n  border-radius: 12px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);")
css = css.replace(".login-quick-btn:hover {\n  background: #f8fafc;\n  border-color: #0088cc;\n  color: #0088cc;",
                  ".login-quick-btn:hover {\n  background: #f0fdf4;\n  border-color: #126e51;\n  color: #126e51;")
css = css.replace(".login-quick-btn.client {\n  color: #0369a1;\n  background: #f0f9ff;\n  border-color: #bae6fd;",
                  ".login-quick-btn.client {\n  color: #047857;\n  background: #ecfdf5;\n  border-color: #a7f3d0;")
css = css.replace(".login-quick-btn.client:hover {\n  background: #e0f2fe;",
                  ".login-quick-btn.client:hover {\n  background: #d1fae5;")
css = css.replace(".login-toggle-pw {\n  background: transparent;\n  border: none;\n  font-size: 12px;\n  color: #0088cc;",
                  ".login-toggle-pw {\n  background: transparent;\n  border: none;\n  font-size: 12px;\n  color: #059669;")
css = css.replace(".login-input:focus {\n  background: #ffffff !important;\n  border-color: #0088cc !important;\n  box-shadow: 0 0 0 3px rgba(0, 136, 204, 0.18) !important;",
                  ".login-input:focus {\n  background: #ffffff !important;\n  border-color: #059669 !important;\n  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;")
css = css.replace(".login-submit-btn {\n  background: #0088cc;\n  color: #ffffff;\n  border: none;\n  border-radius: 6px;\n  padding: 12px;\n  font-size: 15px;\n  font-weight: 800;\n  letter-spacing: 0.3px;\n  cursor: pointer;\n  margin-top: 6px;\n  box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);",
                  ".login-submit-btn {\n  background: #126e51;\n  color: #ffffff;\n  border: none;\n  border-radius: 6px;\n  padding: 12px;\n  font-size: 15px;\n  font-weight: 800;\n  letter-spacing: 0.3px;\n  cursor: pointer;\n  margin-top: 6px;\n  box-shadow: 0 4px 12px rgba(18, 110, 81, 0.35);")
css = css.replace(".login-submit-btn:hover:not(:disabled) {\n  background: #0077b5;\n  box-shadow: 0 6px 16px rgba(0, 136, 204, 0.4);",
                  ".login-submit-btn:hover:not(:disabled) {\n  background: #0e5b42;\n  box-shadow: 0 6px 16px rgba(18, 110, 81, 0.45);")

with open("app/globals.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Emerald theme successfully applied to app/globals.css")
