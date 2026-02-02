from playwright.sync_api import sync_playwright, Route, Request
import json
import time
import re

def test_audio_player_slider(page):
    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # Mock Last.fm API
    def handle_lastfm(route: Route):
        url = route.request.url
        print(f"Intercepted: {url}")

        # Helper to return success
        def success(data):
            route.fulfill(status=200, content_type="application/json", body=json.dumps(data))

        if "method=artist.getinfo" in url:
            print("Fulfilling artist.getinfo")
            success({
                "artist": {
                    "name": "Miles Davis",
                    "mbid": "123",
                    "url": "http://url",
                    "image": [{"#text": "http://image", "size": "extralarge"}],
                    "stats": {"listeners": "1000", "playcount": "2000"},
                    "tags": {"tag": [{"name": "jazz"}]}
                }
            })
        elif "method=artist.getsimilar" in url:
            print("Fulfilling artist.getsimilar")
            success({
                "similarartists": {
                    "artist": [
                        {"name": "John Coltrane", "match": "1.0", "image": []},
                        {"name": "Bill Evans", "match": "0.9", "image": []}
                    ]
                }
            })
        elif "method=artist.search" in url:
             route.fulfill(json={"results": {"artistmatches": {"artist": []}}})
        else:
            route.continue_()

    # Intercept API calls
    def log_request(request: Request):
        print(f"Request: {request.url}")

    page.on("request", log_request)
    # Use Regex
    page.route(re.compile(r".*audioscrobbler.*"), handle_lastfm)
    page.route(re.compile(r".*/api/.*"), handle_lastfm)

    print("Navigating to app...")
    page.goto("http://localhost:8080")

    print("Waiting for slider...")
    try:
        slider = page.get_by_role("slider").first
        slider.wait_for(state="attached", timeout=15000)
        print("Slider found by role.")

        # Check for label
        label = slider.get_attribute("aria-label")
        print(f"Slider aria-label: {label}")

    except Exception as e:
        print(f"Slider not found: {e}")

    page.screenshot(path="verification/audio_player.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_audio_player_slider(page)
        except Exception as e:
            print(f"Global Error: {e}")
        finally:
            browser.close()
