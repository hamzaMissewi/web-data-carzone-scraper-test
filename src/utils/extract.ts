import { Page } from "playwright";
import { CarListing } from "../types";

export async function extractListings(page: Page): Promise<CarListing[]> {
  return await page.$$eval(".listing-card", (cards) =>
    cards.map((card) => ({
      id: card.getAttribute("data-id") || "",
      title: card.querySelector("h2")?.textContent?.trim() || "",
      price: card.querySelector(".price")?.textContent?.trim() || "",
      year: card.querySelector(".year")?.textContent?.trim() || "",
      mileage: card.querySelector(".mileage")?.textContent?.trim() || "",
      fuel: card.querySelector(".fuel")?.textContent?.trim() || "",
      transmission:
        card.querySelector(".transmission")?.textContent?.trim() || "",
      location: card.querySelector(".location")?.textContent?.trim() || "",
      url: (card.querySelector("a") as HTMLAnchorElement)?.href || "",
      images: Array.from(card.querySelectorAll("img")).map((img) => img.src),
    }))
  );
}
