from playwright.sync_api import sync_playwright, expect

def verify_slider():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to home...")
        page.goto("http://localhost:8080")

        # Wait for the audio player to appear (it renders when track is loaded)
        # The track is loaded by useTrackPreview for the anchor artist (Miles Davis)
        print("Waiting for audio player...")

        # Wait for the slider to be visible
        slider = page.get_by_role("slider", name="Seek time")
        slider.wait_for(timeout=10000)

        print("Slider found!")

        # Verify initial state
        expect(slider).to_be_visible()

        # Take a screenshot of the player area (bottom of the screen)
        # We can select the parent container of the slider or just take a viewport screenshot

        # Taking a screenshot of the whole page first
        page.screenshot(path="verification/full_page.png")

        # Locate the player container
        player_container = page.locator(".fixed.bottom-8")
        player_container.wait_for()
        player_container.screenshot(path="verification/player_slider.png")

        print("Screenshots taken.")
        browser.close()

if __name__ == "__main__":
    verify_slider()
