from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright


def resolve_base_url() -> str:
    for url in ["http://localhost:4321", "http://127.0.0.1:4321"]:
        try:
            with urlopen(url, timeout=2) as r:  # type: ignore[arg-type]
                if r.status == 200:
                    return url
        except Exception:
            continue
    raise SystemExit("Server not reachable on 4321. Run `npm run dev` and try again.")


def take_shots():
    base_url = resolve_base_url()
    out_dir = Path("playwright-snapshots")
    out_dir.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()

        viewports = [
            ("desktop", {"width": 1440, "height": 900, "dpr": 2}),
            ("mobile", {"width": 390, "height": 844, "dpr": 3}),
        ]

        for label, vp in viewports:
            ctx = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                device_scale_factor=vp["dpr"],
            )
            page = ctx.new_page()
            page.goto(base_url, wait_until="load")
            page.wait_for_timeout(400)
            page.screenshot(path=str(out_dir / f"home-{label}.png"), full_page=True)

            crafted_selector = "#crafted"
            el = page.locator(crafted_selector).first
            el.scroll_into_view_if_needed()
            page.wait_for_timeout(150)
            el.screenshot(path=str(out_dir / f"crafted-{label}.png"))

        browser.close()

    print("Screenshots saved in", out_dir.resolve())


if __name__ == "__main__":
    take_shots()


