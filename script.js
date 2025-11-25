const SEARCH_TERM_INITIAL = "best sellers";
const MAX_RESULTS = 40;
const MAX_DESCRIPTION_LENGTH = 300;

let allBooksData = [];

/* ==========================
   1. ЗАВАНТАЖЕННЯ КНИГ
   ========================== */

async function fetchBooks(query) {
  const safeQuery = encodeURIComponent(query.trim());
  const API_URL = `https://www.googleapis.com/books/v1/volumes?q=${safeQuery}&maxResults=${MAX_RESULTS}&langRestrict=uk`;

  const rootElem = document.getElementById("root");
  rootElem.innerHTML =
    '<h3 style="color: var(--color-text-primary); text-align: center; grid-column: 1 / -1;">Завантаження книг...</h3>';

  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Помилка HTTP: статус ${response.status}.`);
    }
    const data = await response.json();

    if (data.items) {
      return data.items.filter(
        (book) =>
          book.volumeInfo &&
          book.volumeInfo.title &&
          (book.volumeInfo.description || book.volumeInfo.subtitle)
      );
    } else {
      rootElem.innerHTML = `<p style="color: var(--color-text-secondary); text-align: center; grid-column: 1 / -1;">За запитом "${query}" нічого не знайдено.</p>`;
      return [];
    }
  } catch (error) {
    console.error("Помилка завантаження книг:", error);
    rootElem.innerHTML = `<p style="color: #ff6b6b; text-align: center; grid-column: 1 / -1;">Помилка завантаження даних: ${error.message}</p>`;
    return [];
  }
}

async function setup() {
  allBooksData = await fetchBooks(SEARCH_TERM_INITIAL);

  const searchInput = document.getElementById("searchInput");
  searchInput.placeholder = "Введіть назву книги, автора або ISBN...";
  searchInput.addEventListener("input", handleSearch);

  document
    .getElementById("resetSearchButton")
    .addEventListener("click", handleReset);
  document.getElementById("sortSelect").addEventListener("change", handleSort);
  document
    .getElementById("episodeSelect")
    .addEventListener("change", handleSelectChange);

  if (allBooksData.length > 0) {
    const sortedList = applySort(allBooksData);
    makePageForBooks(sortedList);
  }

  document.getElementById(
    "searchCount"
  ).textContent = `Всього книг : ${allBooksData.length}`;

  initModalLogic();
  initThemeToggle();
  initHeaderShadowOnScroll();
}

function makePageForBooks(bookList, updateSelect = true) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";
  const selectElem = document.getElementById("episodeSelect");

  if (updateSelect) {
    selectElem.innerHTML = "<option value='-1'>Оберіть книгу</option>";

    allBooksData.forEach((book) => {
      const option = document.createElement("option");
      const { id, volumeInfo } = book;

      option.value = id.toString();
      option.textContent = volumeInfo.title;
      selectElem.appendChild(option);
    });
  }

  bookList.forEach(displayBook);

  enhanceBookCards();
}

function displayBook(book) {
  const { id, volumeInfo } = book;

  const title = volumeInfo.title || "Назва відсутня";
  const authors = volumeInfo.authors
    ? volumeInfo.authors.join(", ")
    : "Автор невідомий";

  const descriptionSource =
    volumeInfo.description || volumeInfo.subtitle || "";
  const overview = descriptionSource;

  let readMoreButton = "";
  if (volumeInfo.infoLink) {
    readMoreButton = `<a href="${volumeInfo.infoLink}" target="_blank" class="read-more-link">Купити...</a>`;
  }

  const placeholderUrl =
    "https://via.placeholder.com/128x192?text=No+Cover";
  const imageUrl = volumeInfo.imageLinks
    ? volumeInfo.imageLinks.thumbnail ||
      volumeInfo.imageLinks.smallThumbnail ||
      placeholderUrl
    : placeholderUrl;

  const bookCard = document.createElement("div");
  bookCard.className = "episode-item";

  bookCard.innerHTML = `
    <a href="${volumeInfo.infoLink}" target="_blank" class="book-link-wrapper">
        <h3 class="episode-title">${title}</h3>
    </a>
    
    <img class="episode-image" src="${imageUrl}" alt="Обкладинка книги ${title}">
    
    <p class="episode-authors">Автор(и): ${authors}</p>
    
    <div class="description-container">
        <p class="episode-summary scrollable-summary">
            ${overview}
        </p>
        
        ${readMoreButton}
    </div>
  `;

  document.getElementById("root").appendChild(bookCard);
}

/* ==========================
   2. ОБРОБКА ПОДІЙ
   ========================== */

function handleReset() {
  document.getElementById("searchInput").value = "";
  document.getElementById("episodeSelect").value = "-1";
  document.getElementById("sortSelect").value = "none";

  const searchCountElem = document.getElementById("searchCount");
  searchCountElem.textContent = `Всього книг: ${allBooksData.length}`;

  const sortedList = applySort(allBooksData);
  makePageForBooks(sortedList, true);
}

function handleSort() {
  const listToDisplay = getDisplayList();
  const sortedList = applySort(listToDisplay);

  makePageForBooks(sortedList, false);
}

function getDisplayList() {
  const selectedId = document.getElementById("episodeSelect").value;
  const searchTerm = document
    .getElementById("searchInput")
    .value.toLowerCase()
    .trim();

  if (selectedId !== "-1") {
    return allBooksData.filter((book) => book.id.toString() === selectedId);
  } else if (searchTerm) {
    return allBooksData.filter((book) => {
      const volumeInfo = book.volumeInfo;
      const bookTitle = volumeInfo.title
        ? volumeInfo.title.toLowerCase()
        : "";
      const bookAuthors = volumeInfo.authors
        ? volumeInfo.authors.join(", ").toLowerCase()
        : "";
      const bookOverview = volumeInfo.description
        ? volumeInfo.description.toLowerCase()
        : "";

      return (
        bookTitle.includes(searchTerm) ||
        bookAuthors.includes(searchTerm) ||
        bookOverview.includes(searchTerm)
      );
    });
  } else {
    return allBooksData;
  }
}

function applySort(list) {
  const sortCriterion = document.getElementById("sortSelect").value;

  if (sortCriterion === "none") {
    return list;
  }

  const sortedList = [...list];

  sortedList.sort((a, b) => {
    const infoA = a.volumeInfo;
    const infoB = b.volumeInfo;

    if (sortCriterion === "title") {
      const titleA = infoA.title || "";
      const titleB = infoB.title || "";
      return titleA.localeCompare(titleB);
    } else if (sortCriterion === "author") {
      const authorA = (infoA.authors && infoA.authors[0]) || "";
      const authorB = (infoB.authors && infoB.authors[0]) || "";
      return authorA.localeCompare(authorB);
    } else if (sortCriterion === "year_desc" || sortCriterion === "year_asc") {
      const yearA =
        parseInt((infoA.publishedDate || "0").substring(0, 4)) || 0;
      const yearB =
        parseInt((infoB.publishedDate || "0").substring(0, 4)) || 0;

      if (yearA === yearB) return 0;

      if (sortCriterion === "year_desc") {
        return yearB - yearA;
      } else {
        return yearA - yearB;
      }
    }
    return 0;
  });

  return sortedList;
}

function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim();

  document.getElementById("episodeSelect").value = "-1";

  const filteredBooks = getDisplayList();

  const searchCountElem = document.getElementById("searchCount");
  searchCountElem.textContent = `Знайдено книг: ${filteredBooks.length} / ${allBooksData.length}`;

  const sortedList = applySort(filteredBooks);
  makePageForBooks(sortedList, false);
}

function handleSelectChange() {
  const selectElem = document.getElementById("episodeSelect");
  const selectedId = selectElem.value;

  document.getElementById("searchInput").value = "";

  const searchCountElem = document.getElementById("searchCount");

  if (selectedId !== "-1") {
    const selectedBook = getDisplayList();

    if (selectedBook.length > 0) {
      const sortedList = applySort(selectedBook);
      makePageForBooks(sortedList, false);
      searchCountElem.textContent = `Обрана книга: 1 / ${allBooksData.length}`;
    }
  } else {
    const sortedList = applySort(allBooksData);
    makePageForBooks(sortedList, false);
    searchCountElem.textContent = `Всього книг: ${allBooksData.length}`;
  }
}

/* ==========================
   3. МОДАЛЬНЕ ВІКНО + SHARE
   ========================== */

function getBookDataFromCard(card) {
  const titleEl = card.querySelector(".episode-title");
  const authorsEl = card.querySelector(".episode-authors");
  const imgEl = card.querySelector(".episode-image");
  const descEl = card.querySelector(".episode-summary");
  const linkEl = card.querySelector(".book-link-wrapper");

  return {
    title: titleEl ? titleEl.textContent.trim() : "Без назви",
    authors: authorsEl ? authorsEl.textContent.trim() : "Автор невідомий",
    image: imgEl ? imgEl.src : "",
    description: descEl ? descEl.textContent.trim() : "Опис відсутній",
    link: linkEl ? linkEl.href : window.location.href,
  };
}

function openBookModalFromCard(card) {
  const data = getBookDataFromCard(card);
  const modal = document.getElementById("bookModal");
  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");

  document.getElementById("modalTitle").textContent = data.title;
  document.getElementById("modalAuthors").textContent = data.authors;
  document.getElementById("modalDescription").textContent = data.description;
  document.getElementById("modalYear").textContent = "";

  const img = document.getElementById("modalImage");
  if (data.image) {
    img.src = data.image;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }

  const link = document.getElementById("modalLink");
  link.href = data.link || "#";

  document.body.style.overflow = "hidden";
}

function closeBookModal() {
  const modal = document.getElementById("bookModal");
  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function initModalLogic() {
  const modal = document.getElementById("bookModal");
  if (!modal) return;

  const closeBtn = document.getElementById("modalCloseBtn");

  closeBtn.addEventListener("click", closeBookModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeBookModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeBookModal();
    }
  });
}

function enhanceBookCards() {
  const cards = document.querySelectorAll(".episode-item");

  cards.forEach((card) => {
    if (card.dataset.enhanced === "true") return;
    card.dataset.enhanced = "true";

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const detailsBtn = document.createElement("button");
    detailsBtn.className = "card-button card-button--primary";
    detailsBtn.textContent = "Читати більше...";
    detailsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openBookModalFromCard(card);
    });

    const shareBtn = document.createElement("button");
    shareBtn.className = "card-button";
    shareBtn.textContent = "Поділитися";
    shareBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await shareBookFromCard(card);
    });

    actions.appendChild(detailsBtn);
    actions.appendChild(shareBtn);
    card.appendChild(actions);
  });
}

async function shareBookFromCard(card) {
  const data = getBookDataFromCard(card);
  const shareData = {
    title: data.title,
    text: `Рекомендую книгу: "${data.title}"`,
    url: data.link || window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      console.warn("Share cancelled or failed", err);
    }
  } else if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(shareData.url);
      alert("Посилання на книгу скопійовано в буфер обміну.");
    } catch (err) {
      alert(
        "Не вдалося скопіювати посилання. Ось воно:\n" + shareData.url
      );
    }
  } else {
    alert("Ось посилання на книгу:\n" + shareData.url);
  }
}

/* ==========================
   4. ТЕМА (DARK / LIGHT)
   ========================== */

function applyTheme(theme) {
  const body = document.body;
  const btn = document.getElementById("themeToggle");

  if (theme === "light") {
    body.classList.add("light-theme");
    if (btn) btn.textContent = "🌞 Тема";
  } else {
    body.classList.remove("light-theme");
    if (btn) btn.textContent = "🌙 Тема";
  }

  localStorage.setItem("theme", theme);
}

function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);

  btn.addEventListener("click", () => {
    const isLight = document.body.classList.contains("light-theme");
    const next = isLight ? "dark" : "light";
    applyTheme(next);
  });
}

/* ==========================
   5. ТІНЬ ДЛЯ ХЕДЕРА ПРИ СКРОЛІ
   ========================== */

function initHeaderShadowOnScroll() {
  const header = document.querySelector(".app-header");
  if (!header) return;

  function updateShadow() {
    if (window.scrollY > 10) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", updateShadow);
  updateShadow();
}

window.onload = setup;
