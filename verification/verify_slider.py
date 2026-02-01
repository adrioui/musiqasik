
import json
from playwright.sync_api import sync_playwright, expect

def test_audioplayer_slider(page):
    # Mock Last.fm API responses
    def handle_lastfm(route):
        url = route.request.url
        print(f"Intercepted: {url}")

        if "method=artist.getinfo" in url:
            route.fulfill(json={
                "artist": {
                    "name": "Miles Davis",
                    "mbid": "miles-davis-mbid",
                    "url": "http://last.fm/music/Miles+Davis",
                    "image": [{"#text": "http://example.com/miles.jpg", "size": "extralarge"}],
                    "stats": {"listeners": "1000000", "playcount": "5000000"},
                    "tags": {"tag": [{"name": "jazz"}, {"name": "cool jazz"}]},
                    "bio": {"summary": "Jazz legend."}
                }
            })
        elif "method=artist.getsimilar" in url:
            route.fulfill(json={
                "similarartists": {
                    "artist": [
                        {"name": "John Coltrane", "mbid": "jc", "match": "1.0"},
                        {"name": "Bill Evans", "mbid": "be", "match": "0.9"}
                    ]
                }
            })
        elif "method=artist.search" in url:
             route.fulfill(json={
                "results": {
                    "artistmatches": {
                        "artist": [
                             {"name": "Miles Davis", "listeners": "1000", "image": [{"#text": "", "size": "large"}]}
                        ]
                    }
                }
            })
        else:
            route.continue_()

    # Intercept Last.fm API calls
    page.route("**/*audioscrobbler.com/**/*", handle_lastfm)

    # Mock Deezer call if it happens
    page.route("**/*api.deezer.com/**/*", lambda route: route.fulfill(json={"data": []}))

    print("Navigating to app...")
    page.goto("http://localhost:8080")

    print("Waiting for AudioPlayer...")
    # Wait for the AudioPlayer to be visible (it has class 'fixed bottom-8')
    # Since track might not have image, it might look different, but the container is there.
    # The container has 'glass-panel-pill' class.

    # We need to wait for the graph to load and anchor artist to be set.
    # This happens when getGraph returns.

    player = page.locator(".glass-panel-pill").first
    expect(player).to_be_visible(timeout=10000)

    print("Interacting with Slider...")

    # Find the slider thumb
    thumb = page.locator("[role='slider']")
    expect(thumb).to_be_attached()

    # Hover over the slider (group) to reveal the thumb
    # We find the .group that contains the slider
    slider_group = page.locator(".group").filter(has=thumb).first
    slider_group.hover(force=True)

    # Wait a bit for transition
    page.wait_for_timeout(1000)

    # Take screenshot
    print("Taking screenshot...")
    page.screenshot(path="verification/audioplayer_slider.png")
    print("Done!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_audioplayer_slider(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
