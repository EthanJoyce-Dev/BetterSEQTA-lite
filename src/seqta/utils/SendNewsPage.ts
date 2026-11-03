import { AppendLoadingSymbol } from "@/seqta/ui/Loading";
import stringToHTML from "./stringToHTML";
import { delay } from "./delay";
import { settingsState } from "./listeners/SettingsState";
import browser from "webextension-polyfill";
import LogoLightOutline from "@/resources/icons/betterseqta-light-outline.png";
import { httpUrl, plainText } from "./newsFeedContent";

export async function SendNewsPage() {
  console.info("[BetterSEQTA+ Lite] Started Loading News Page");
  document.title = "News ― SEQTA Learn";
  await delay(10);

  const element = document.querySelector("[data-key=news]");
  element!.classList.add("active");

  // Remove all current elements in the main div to add new elements
  const main = document.getElementById("main");
  main!.innerHTML = "";

  const displayCountry = (() => {
    switch (settingsState.newsSource?.toLowerCase()) {
      case "usa": return "the USA";
      case "uk": return "the UK";
      case "netherlands": return "the Netherlands";
      default:
        return settingsState.newsSource
          ? settingsState.newsSource
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
          : "Australia";
    }
  })();

  const html = stringToHTML(/* html */ `
  <div class="home-root">
    <div class="home-container" id="news-container">
      <h1 class="border">Latest Headlines in ${displayCountry}</h1>
    </div>
  </div>`);

  main!.append(html.firstChild!);

  const titlediv = document.getElementById("title")!.firstChild;
  (titlediv! as HTMLElement).innerText = "News";
  AppendLoadingSymbol("newsloading", "#news-container");

  const response = (await browser.runtime.sendMessage({
    type: "sendNews",
    source: settingsState.newsSource,
  })) as any;
  const newscontainer = document.querySelector("#news-container");
  document.getElementById("newsloading")?.remove();

  const articles = response?.news?.articles;
  if (!Array.isArray(articles) || articles.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.classList.add("day-empty");
    const img = document.createElement("img");
    img.src = browser.runtime.getURL(LogoLightOutline);
    const text = document.createElement("p");
    text.innerText = "No news articles available right now.";
    emptyState.append(img, text);
    newscontainer?.append(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  articles.forEach((article: any) => {
    const link = httpUrl(article.url);
    const imageUrl = httpUrl(article.urlToImage);

    const newsarticle = document.createElement("a");
    newsarticle.classList.add("NewsArticle");
    if (link) newsarticle.href = link;
    newsarticle.target = "_blank";

    const articleimage = document.createElement("div");
    articleimage.classList.add("articleimage");

    if (!imageUrl) {
      articleimage.style.cssText = `
        background-image: url(${browser.runtime.getURL(LogoLightOutline)});
        width: 20%;
        margin: 0 7.5%;
      `;
    } else {
      articleimage.style.backgroundImage = `url("${imageUrl}")`;
    }

    const articletext = document.createElement("div");
    articletext.classList.add("ArticleText");

    const title = document.createElement("a");
    title.innerText = article.title;
    if (link) title.href = link;
    title.target = "_blank";

    const description = document.createElement("p");
    const articleDescription =
      (typeof article.description === "string" && plainText(article.description)) ||
      "No description available.";

    description.textContent =
      articleDescription.length > 400
        ? articleDescription.substring(0, 400) + "..."
        : articleDescription;

    articletext.append(title, description);
    newsarticle.append(articleimage, articletext);
    fragment.append(newsarticle);
  });

  // Single DOM update to append all articles
  newscontainer?.append(fragment);
}
