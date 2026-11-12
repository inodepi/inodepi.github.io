help:
	@echo ""
	@echo "usage: make COMMAND"
	@echo ""
	@echo "Commands:"
	@echo ""
	@echo "    s      Run the scraper: scrape -> Gemini summary -> Discord"
	@echo "    dry    Preview the payloads without sending (DRY_RUN=1)"
	@echo ""
	@echo "Required for 'make s': DISCORD_WEBHOOK_URL and GEMINI_API_KEY"
	@echo ""

s:
	@python3 main.py

dry:
	@DRY_RUN=1 python3 main.py

.PHONY: s dry help
