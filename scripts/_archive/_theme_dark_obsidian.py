with open("app/globals.css", "r", encoding="utf-8") as f:
    css = f.read()

# Replace body background and base text
css = css.replace(".play-page-root {\n  background: #eef2f6;\n  color: #1e293b;",
                  ".play-page-root {\n  background: #0b0f15;\n  color: #e2e8f0;")

# Search wrap in header
css = css.replace(".ref-search-wrap {\n  display: flex;\n  align-items: center;\n  background: #ffffff;\n  border-radius: 20px;\n  padding: 2px 10px;\n  width: 220px;\n}",
                  ".ref-search-wrap {\n  display: flex;\n  align-items: center;\n  background: rgba(0, 0, 0, 0.32);\n  border: 1px solid rgba(255, 255, 255, 0.15);\n  border-radius: 20px;\n  padding: 2px 12px;\n  width: 220px;\n}")
css = css.replace(".ref-search-icon {\n  font-size: 13px;\n  color: #64748b;",
                  ".ref-search-icon {\n  font-size: 13px;\n  color: rgba(255, 255, 255, 0.7);")
css = css.replace(".ref-search-input {\n  border: none !important;\n  background: transparent !important;\n  font-size: 13px !important;\n  outline: none !important;\n  color: #1e293b !important;",
                  ".ref-search-input {\n  border: none !important;\n  background: transparent !important;\n  font-size: 13px !important;\n  outline: none !important;\n  color: #ffffff !important;")

# Dropdown menu
css = css.replace(".ref-dropdown-menu-active {\n  position: absolute;\n  right: 0;\n  top: 100%;\n  margin-top: 6px;\n  background: #ffffff;\n  min-width: 210px;\n  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);\n  border: 1px solid #cbd5e1;",
                  ".ref-dropdown-menu-active {\n  position: absolute;\n  right: 0;\n  top: 100%;\n  margin-top: 6px;\n  background: #131b24;\n  min-width: 210px;\n  box-shadow: 0 14px 35px rgba(0, 0, 0, 0.6);\n  border: 1px solid #233140;")
css = css.replace(".ref-dropdown-header {\n  padding: 10px 14px;\n  background: #f8fafc;",
                  ".ref-dropdown-header {\n  padding: 10px 14px;\n  background: #0f161e;\n  border-bottom: 1px solid #1e2a38;")
css = css.replace(".ref-dropdown-user-title {\n  font-weight: 800;\n  font-size: 14px;\n  color: #0f172a;",
                  ".ref-dropdown-user-title {\n  font-weight: 800;\n  font-size: 14px;\n  color: #ffffff;")
css = css.replace(".ref-dropdown-divider {\n  height: 1px;\n  background: #e2e8f0;",
                  ".ref-dropdown-divider {\n  height: 1px;\n  background: #1e2a38;")
css = css.replace(".ref-menu-item {\n  padding: 8px 14px;\n  color: #1e293b;\n  text-decoration: none;\n  font-size: 13px;\n  font-weight: 600;\n  border-bottom: 1px solid #f1f5f9;",
                  ".ref-menu-item {\n  padding: 8px 14px;\n  color: #cbd5e1;\n  text-decoration: none;\n  font-size: 13px;\n  font-weight: 600;\n  border-bottom: 1px solid #1a2532;")
css = css.replace(".ref-menu-item:hover {\n  background: #f0fdf4;\n  text-decoration: none;\n  color: #126e51;",
                  ".ref-menu-item:hover {\n  background: #1c2734;\n  text-decoration: none;\n  color: #00c278;")

# Sidebar card & links
css = css.replace(".ref-side-card {\n  background: #ffffff;\n  border: 1px solid #cbd5e1;",
                  ".ref-side-card {\n  background: #131b24;\n  border: 1px solid #1e2a38;")
css = css.replace(".ref-side-link {\n  padding: 7px 10px;\n  font-size: 13px;\n  color: #334155;\n  border-bottom: 1px solid #f1f5f9;\n  text-decoration: none;\n  font-weight: 500;",
                  ".ref-side-link {\n  padding: 7px 10px;\n  font-size: 13px;\n  color: #cbd5e1;\n  border-bottom: 1px solid #18222e;\n  text-decoration: none;\n  font-weight: 500;")
css = css.replace(".ref-side-link:hover {\n  background: #f0fdf4;\n  color: #126e51;",
                  ".ref-side-link:hover {\n  background: #182430;\n  color: #00c278;")
css = css.replace(".ref-badge-count {\n  font-size: 10px;\n  background: #e2e8f0;\n  color: #475569;",
                  ".ref-badge-count {\n  font-size: 10px;\n  background: #1a2532;\n  color: #94a3b8;\n  border: 1px solid #243344;")

# Sport tabs bar & buttons
css = css.replace(".ref-sport-tabs-bar {\n  display: flex;\n  gap: 4px;\n  margin-bottom: 8px;\n  overflow-x: auto;\n  white-space: nowrap;\n  border-bottom: 2px solid #cbd5e1;",
                  ".ref-sport-tabs-bar {\n  display: flex;\n  gap: 4px;\n  margin-bottom: 8px;\n  overflow-x: auto;\n  white-space: nowrap;\n  border-bottom: 2px solid #1e2a38;")
css = css.replace(".ref-sport-tab-btn {\n  background: #e2e8f0;\n  border: 1px solid #cbd5e1;\n  color: #334155;",
                  ".ref-sport-tab-btn {\n  background: #131b24;\n  border: 1px solid #1e2a38;\n  color: #94a3b8;")
css = css.replace(".ref-sport-tab-btn:hover {\n  background: #cbd5e1;",
                  ".ref-sport-tab-btn:hover {\n  background: #1c2734;\n  color: #ffffff;")
css = css.replace(".ref-sport-tab-btn.active {\n  background: #126e51;\n  color: #ffffff;\n  border-color: #126e51;",
                  ".ref-sport-tab-btn.active {\n  background: #0f5940;\n  color: #ffffff;\n  border-color: #00c278;\n  box-shadow: 0 2px 8px rgba(0, 194, 120, 0.25);")

# Filter input
css = css.replace(".ref-filter-input {\n  flex: 1;\n  background: #ffffff !important;\n  color: #1e293b !important;\n  border: 1px solid #cbd5e1 !important;",
                  ".ref-filter-input {\n  flex: 1;\n  background: #131b24 !important;\n  color: #ffffff !important;\n  border: 1px solid #1e2a38 !important;")
css = css.replace(".ref-clear-search-btn {\n  background: #e2e8f0;\n  border: 1px solid #cbd5e1;\n  border-radius: 4px;\n  padding: 6px 12px;\n  font-size: 12px;\n  font-weight: 600;\n  color: #475569;",
                  ".ref-clear-search-btn {\n  background: #1a2532;\n  border: 1px solid #243344;\n  border-radius: 4px;\n  padding: 6px 12px;\n  font-size: 12px;\n  font-weight: 600;\n  color: #94a3b8;")
css = css.replace(".ref-empty-row {\n  padding: 24px;\n  text-align: center;\n  color: #64748b;",
                  ".ref-empty-row {\n  padding: 24px;\n  text-align: center;\n  color: #94a3b8;")

# Exchange table card & header
css = css.replace(".ref-table-card {\n  background: #ffffff;\n  border: 1px solid #cbd5e1;\n  margin-bottom: 14px;\n}",
                  ".ref-table-card {\n  background: #131b24;\n  border: 1px solid #1e2a38;\n  margin-bottom: 14px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);\n}")
css = css.replace(".ref-table-head {\n  background: #f8fafc;\n  border-bottom: 2px solid #cbd5e1;\n  display: flex;\n  align-items: stretch;\n  font-weight: 700;\n  font-size: 13px;\n  color: #1e293b;\n  text-align: center;\n}",
                  ".ref-table-head {\n  background: #0d141b;\n  border-bottom: 2px solid #1e2a38;\n  display: flex;\n  align-items: stretch;\n  font-weight: 700;\n  font-size: 13px;\n  color: #cbd5e1;\n  text-align: center;\n}")
css = css.replace(".ref-col-outcome-group {\n  width: 96px;\n  display: flex;\n  flex-direction: column;\n  border-left: 1px solid #cbd5e1;\n}",
                  ".ref-col-outcome-group {\n  width: 96px;\n  display: flex;\n  flex-direction: column;\n  border-left: 1px solid #1e2a38;\n}")
css = css.replace(".ref-group-title {\n  font-size: 13px;\n  padding: 3px 0;\n  font-weight: 800;\n  background: #f1f5f9;\n  border-bottom: 1px solid #cbd5e1;\n}",
                  ".ref-group-title {\n  font-size: 13px;\n  padding: 3px 0;\n  font-weight: 800;\n  background: #101922;\n  color: #cbd5e1;\n  border-bottom: 1px solid #1e2a38;\n}")
css = css.replace(".ref-subcol-back {\n  background: #72bbef;\n  color: #000000;\n  padding: 2px 0;\n}",
                  ".ref-subcol-back {\n  background: #1e3a5f;\n  color: #72bbef;\n  padding: 2px 0;\n  border-right: 1px solid #131b24;\n}")
css = css.replace(".ref-subcol-lay {\n  background: #faa9ba;\n  color: #000000;\n  padding: 2px 0;\n}",
                  ".ref-subcol-lay {\n  background: #4a1d2f;\n  color: #faa9ba;\n  padding: 2px 0;\n}")

# Match rows
css = css.replace(".ref-match-row {\n  display: flex;\n  align-items: stretch;\n  border-bottom: 1px solid #e5e7eb;\n  background: #ffffff;\n}",
                  ".ref-match-row {\n  display: flex;\n  align-items: stretch;\n  border-bottom: 1px solid #1a2430;\n  background: #131b24;\n}")
css = css.replace(".ref-match-row:hover {\n  background: #f8fafc;\n}",
                  ".ref-match-row:hover {\n  background: #18232f;\n}")
css = css.replace(".ref-match-name {\n  font-weight: 700;\n  font-size: 13px;\n  color: #0f172a;",
                  ".ref-match-name {\n  font-weight: 700;\n  font-size: 13px;\n  color: #f1f5f9;")
css = css.replace(".ref-match-name:hover {\n  color: #126e51;",
                  ".ref-match-name:hover {\n  color: #00c278;")
css = css.replace(".ref-match-date {\n  font-size: 11px;\n  color: #64748b;",
                  ".ref-match-date {\n  font-size: 11px;\n  color: #94a3b8;")
css = css.replace(".ref-odds-cell-group {\n  width: 96px;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1px;\n  padding: 2px 2px;\n  border-left: 1px solid #e5e7eb;\n}",
                  ".ref-odds-cell-group {\n  width: 96px;\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 2px;\n  padding: 2px 2px;\n  border-left: 1px solid #1a2430;\n}")

# Odds buttons in premium dark
css = css.replace(".ref-btn-back {\n  background: #72bbef;\n  color: #000000;\n}",
                  ".ref-btn-back {\n  background: #1e3f66;\n  color: #72bbef;\n  border: 1px solid #2b578c;\n}")
css = css.replace(".ref-btn-back:hover {\n  opacity: 0.85;\n  color: #000000;\n  text-decoration: none;\n}",
                  ".ref-btn-back:hover {\n  background: #254d7d;\n  color: #ffffff;\n  text-decoration: none;\n}")
css = css.replace(".ref-btn-lay {\n  background: #faa9ba;\n  color: #000000;\n}",
                  ".ref-btn-lay {\n  background: #501d32;\n  color: #faa9ba;\n  border: 1px solid #752948;\n}")
css = css.replace(".ref-btn-lay:hover {\n  opacity: 0.85;\n  color: #000000;\n  text-decoration: none;\n}",
                  ".ref-btn-lay:hover {\n  background: #66243f;\n  color: #ffffff;\n  text-decoration: none;\n}")
css = css.replace(".ref-disabled {\n  background: #f1f5f9;\n  color: #94a3b8;\n  cursor: default;\n}",
                  ".ref-disabled {\n  background: #0f161e;\n  color: #475569;\n  border: 1px solid #16202c;\n  cursor: default;\n}")

# Providers section
css = css.replace(".ref-providers-section {\n  background: #ffffff;\n  border: 1px solid #cbd5e1;",
                  ".ref-providers-section {\n  background: #131b24;\n  border: 1px solid #1e2a38;")
css = css.replace(".ref-section-heading {\n  margin: 0 0 10px 0;\n  font-size: 15px;\n  font-weight: 700;\n  color: #1e293b;\n}",
                  ".ref-section-heading {\n  margin: 0 0 10px 0;\n  font-size: 15px;\n  font-weight: 700;\n  color: #f1f5f9;\n}")
css = css.replace(".ref-provider-chip-card {\n  background: #f8fafc;\n  border: 1px solid #cbd5e1;",
                  ".ref-provider-chip-card {\n  background: #0f1720;\n  border: 1px solid #1e2a38;")
css = css.replace(".ref-provider-chip-card:hover {\n  border-color: #126e51;\n  background: #f0fdf4;",
                  ".ref-provider-chip-card:hover {\n  border-color: #00c278;\n  background: #16222e;")
css = css.replace(".ref-provider-chip-name {\n  font-weight: 700;\n  font-size: 13px;\n  color: #1e293b;\n}",
                  ".ref-provider-chip-name {\n  font-weight: 700;\n  font-size: 13px;\n  color: #f1f5f9;\n}")

# Sub-pages cards & tables
css = css.replace(".play-page-root .card {\n  background: #ffffff;\n  border: 1px solid #cbd5e1;\n  color: #1e293b;",
                  ".play-page-root .card {\n  background: #131b24;\n  border: 1px solid #1e2a38;\n  color: #e2e8f0;")
css = css.replace(".play-page-root .card h1,\n.play-page-root .card h2,\n.play-page-root .card h3 {\n  color: #0f172a;\n}",
                  ".play-page-root .card h1,\n.play-page-root .card h2,\n.play-page-root .card h3 {\n  color: #f1f5f9;\n}")
css = css.replace(".play-page-root .card .sub {\n  color: #64748b;\n}",
                  ".play-page-root .card .sub {\n  color: #94a3b8;\n}")
css = css.replace(".play-page-root table {\n  background: #ffffff;\n}",
                  ".play-page-root table {\n  background: #131b24;\n}")
css = css.replace(".play-page-root th {\n  background: #f8fafc;\n  color: #475569;\n  border-bottom: 2px solid #cbd5e1;\n}",
                  ".play-page-root th {\n  background: #0f1720;\n  color: #94a3b8;\n  border-bottom: 2px solid #1e2a38;\n}")
css = css.replace(".play-page-root td {\n  border-bottom: 1px solid #e2e8f0;\n  color: #1e293b;\n}",
                  ".play-page-root td {\n  border-bottom: 1px solid #1a2532;\n  color: #e2e8f0;\n}")
css = css.replace(".play-page-root tbody tr:hover {\n  background: #f8fafc;\n}",
                  ".play-page-root tbody tr:hover {\n  background: #18232f;\n}")
css = css.replace(".play-page-root .metric {\n  background: #ffffff;\n  border: 1px solid #cbd5e1;\n  color: #0f172a;\n}",
                  ".play-page-root .metric {\n  background: #0f1720;\n  border: 1px solid #1e2a38;\n  color: #f1f5f9;\n}")
css = css.replace(".play-page-root .metric .v {\n  color: #0f172a;\n}",
                  ".play-page-root .metric .v {\n  color: #00c278;\n}")

# Bet slip in dark
css = css.replace(".ref-betslip-dock {\n  position: fixed;\n  bottom: 20px;\n  right: 20px;\n  width: 360px;\n  max-width: 90vw;\n  background: #ffffff;\n  border: 2px solid #126e51;",
                  ".ref-betslip-dock {\n  position: fixed;\n  bottom: 20px;\n  right: 20px;\n  width: 360px;\n  max-width: 90vw;\n  background: #131b24;\n  border: 2px solid #00c278;\n  box-shadow: 0 16px 45px rgba(0,0,0,0.7);")
css = css.replace(".ref-betslip-header {\n  background: #1e293b;",
                  ".ref-betslip-header {\n  background: #0d151c;\n  border-bottom: 1px solid #1e2a38;")
css = css.replace(".ref-betslip-match-name {\n  font-size: 12px;\n  font-weight: 600;\n  color: #64748b;\n  border-bottom: 1px solid #f1f5f9;",
                  ".ref-betslip-match-name {\n  font-size: 12px;\n  font-weight: 600;\n  color: #94a3b8;\n  border-bottom: 1px solid #1e2a38;")
css = css.replace(".ref-betslip-field label {\n  font-size: 11px;\n  font-weight: 700;\n  color: #475569;",
                  ".ref-betslip-field label {\n  font-size: 11px;\n  font-weight: 700;\n  color: #94a3b8;")
css = css.replace(".ref-betslip-input {\n  background: #f8fafc !important;\n  color: #0f172a !important;\n  border: 1px solid #cbd5e1 !important;",
                  ".ref-betslip-input {\n  background: #0b0f15 !important;\n  color: #f1f5f9 !important;\n  border: 1px solid #1e2a38 !important;")
css = css.replace(".ref-stake-input:focus {\n  border-color: #126e51 !important;\n  background: #ffffff !important;\n  outline: none !important;\n}",
                  ".ref-stake-input:focus {\n  border-color: #00c278 !important;\n  background: #0f1620 !important;\n  outline: none !important;\n}")
css = css.replace(".ref-quick-stake-chip {\n  background: #f1f5f9;\n  border: 1px solid #cbd5e1;\n  border-radius: 3px;\n  padding: 4px 8px;\n  font-size: 11px;\n  font-weight: 700;\n  color: #334155;",
                  ".ref-quick-stake-chip {\n  background: #18232e;\n  border: 1px solid #243344;\n  border-radius: 3px;\n  padding: 4px 8px;\n  font-size: 11px;\n  font-weight: 700;\n  color: #cbd5e1;")
css = css.replace(".ref-quick-stake-chip:hover {\n  background: #e2e8f0;\n  border-color: #94a3b8;",
                  ".ref-quick-stake-chip:hover {\n  background: #202d3c;\n  border-color: #00c278;")
css = css.replace(".ref-max-chip {\n  background: #d1fae5;\n  color: #047857;\n  border-color: #6ee7b7;",
                  ".ref-max-chip {\n  background: #064e3b;\n  color: #34d399;\n  border-color: #059669;")
css = css.replace(".ref-clear-chip {\n  background: #fee2e2;\n  color: #b91c1c;\n  border-color: #fca5a5;",
                  ".ref-clear-chip {\n  background: #450a0a;\n  color: #f87171;\n  border-color: #7f1d1d;")
css = css.replace(".ref-betslip-summary {\n  background: #f8fafc;\n  border: 1px solid #e2e8f0;",
                  ".ref-betslip-summary {\n  background: #0f1720;\n  border: 1px solid #1e2a38;")
css = css.replace(".ref-summary-row {\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  font-weight: 600;\n  color: #334155;",
                  ".ref-summary-row {\n  display: flex;\n  justify-content: space-between;\n  font-size: 13px;\n  font-weight: 600;\n  color: #cbd5e1;")
css = css.replace(".ref-btn-cancel {\n  background: #f1f5f9;\n  border: 1px solid #cbd5e1;\n  color: #475569;",
                  ".ref-btn-cancel {\n  background: #18232e;\n  border: 1px solid #243344;\n  color: #94a3b8;")

# Login card in obsidian dark
css = css.replace(".login-card-container {\n  background: #ffffff;\n  border-radius: 10px;\n  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);",
                  ".login-card-container {\n  background: #131b24;\n  border-radius: 10px;\n  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 194, 120, 0.25);\n  border: 1px solid #1e2a38;")
css = css.replace(".login-title {\n  margin: 0 0 4px;\n  font-size: 24px;\n  font-weight: 900;\n  letter-spacing: 0.5px;\n  color: #0f172a;\n}",
                  ".login-title {\n  margin: 0 0 4px;\n  font-size: 24px;\n  font-weight: 900;\n  letter-spacing: 0.5px;\n  color: #f1f5f9;\n}")
css = css.replace(".login-subtitle {\n  margin: 0;\n  font-size: 13px;\n  color: #64748b;\n  font-weight: 500;\n}",
                  ".login-subtitle {\n  margin: 0;\n  font-size: 13px;\n  color: #94a3b8;\n  font-weight: 500;\n}")
css = css.replace(".login-quick-fill-box {\n  background: #f1f5f9;\n  border: 1px solid #e2e8f0;",
                  ".login-quick-fill-box {\n  background: #0d151c;\n  border: 1px solid #1e2a38;")
css = css.replace(".login-quick-label {\n  display: block;\n  font-size: 11px;\n  font-weight: 700;\n  color: #475569;",
                  ".login-quick-label {\n  display: block;\n  font-size: 11px;\n  font-weight: 700;\n  color: #94a3b8;")
css = css.replace(".login-quick-btn {\n  background: #ffffff;\n  border: 1px solid #cbd5e1;\n  border-radius: 4px;\n  padding: 6px 8px;\n  font-size: 11px;\n  font-weight: 700;\n  color: #1e293b;",
                  ".login-quick-btn {\n  background: #16222e;\n  border: 1px solid #243344;\n  border-radius: 4px;\n  padding: 6px 8px;\n  font-size: 11px;\n  font-weight: 700;\n  color: #cbd5e1;")
css = css.replace(".login-quick-btn:hover {\n  background: #f0fdf4;\n  border-color: #126e51;\n  color: #126e51;",
                  ".login-quick-btn:hover {\n  background: #1e2e3e;\n  border-color: #00c278;\n  color: #00c278;")
css = css.replace(".login-quick-btn.client {\n  color: #047857;\n  background: #ecfdf5;\n  border-color: #a7f3d0;",
                  ".login-quick-btn.client {\n  color: #34d399;\n  background: #064e3b;\n  border-color: #059669;")
css = css.replace(".login-quick-btn.client:hover {\n  background: #d1fae5;",
                  ".login-quick-btn.client:hover {\n  background: #047857;\n  color: #ffffff;")
css = css.replace(".login-label {\n  font-size: 13px;\n  font-weight: 700;\n  color: #334155;",
                  ".login-label {\n  font-size: 13px;\n  font-weight: 700;\n  color: #cbd5e1;")
css = css.replace(".login-input {\n  width: 100% !important;\n  background: #f8fafc !important;\n  border: 1px solid #cbd5e1 !important;",
                  ".login-input {\n  width: 100% !important;\n  background: #0b0f15 !important;\n  border: 1px solid #1e2a38 !important;")
css = css.replace(".login-input:focus {\n  background: #ffffff !important;\n  border-color: #059669 !important;\n  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;\n  outline: none !important;\n}",
                  ".login-input:focus {\n  background: #0f1620 !important;\n  border-color: #00c278 !important;\n  box-shadow: 0 0 0 3px rgba(0, 194, 120, 0.25) !important;\n  outline: none !important;\n}")
css = css.replace(".login-security-footer {\n  margin-top: 24px;\n  padding-top: 16px;\n  border-top: 1px solid #f1f5f9;",
                  ".login-security-footer {\n  margin-top: 24px;\n  padding-top: 16px;\n  border-top: 1px solid #1e2a38;")

# Footer
css = css.replace(".ref-footer {\n  margin-top: 24px;\n  padding: 16px 12px;\n  border-top: 1px solid #cbd5e1;",
                  ".ref-footer {\n  margin-top: 24px;\n  padding: 16px 12px;\n  border-top: 1px solid #1e2a38;")
css = css.replace(".ref-footer-links a {\n  color: #334155;",
                  ".ref-footer-links a {\n  color: #94a3b8;")

with open("app/globals.css", "w", encoding="utf-8") as f:
    f.write(css)

print("Obsidian dark luxury theme applied successfully!")
