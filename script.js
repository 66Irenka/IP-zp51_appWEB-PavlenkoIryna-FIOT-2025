const SEARCH_TERM_INITIAL = "best sellers";

let allBooksData = [];
let currentPage = 1;
const booksPerPage = 6;

let currentDisplayList = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

async function fetchBookDescription(workKey) {
  try {
    const response = await fetch(`https://openlibrary.org${workKey}.json`);
    const data = await response.json();

    if (typeof data.description === "string") {
      return data.description;
    }

    if (data.description && data.description.value) {
      return data.description.value;
    }

    return "";
  } catch (error) {
    console.error("Помилка завантаження опису:", error);
    return "";
  }
}

async function fetchBooks(query) {
  const safeQuery = encodeURIComponent(query.trim());
  const API_URL = `https://openlibrary.org/search.json?q=${safeQuery}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,subtitle`;

  const rootElem = document.getElementById("root");
  rootElem.innerHTML =
    '<h3 style="color: var(--color-text-primary); text-align: center; grid-column: 1 / -1;">Завантаження книг...</h3>';

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Помилка HTTP: статус ${response.status}.`);
    }

    const data = await response.json();

    if (!data.docs || data.docs.length === 0) {
      rootElem.innerHTML = `<p style="color: var(--color-text-secondary); text-align: center; grid-column: 1 / -1;">За запитом "${query}" нічого не знайдено.</p>`;
      return [];
    }

    const books = await Promise.all(
      data.docs.map(async (book) => {
        const fullDescription = await fetchBookDescription(book.key);

        return {
          id: book.key,
          volumeInfo: {
            title: book.title || "Назва відсутня",
            subtitle: book.subtitle || "",
            authors: book.author_name || ["Автор невідомий"],
            description:
              fullDescription ||
              book.subtitle ||
              (book.first_publish_year
                ? `Рік першої публікації: ${book.first_publish_year}`
                : "Опис відсутній"),
            publishedDate: book.first_publish_year
              ? String(book.first_publish_year)
              : "",
            infoLink: `https://openlibrary.org${book.key}`,
            imageLinks: {
              thumbnail: book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
                : "https://via.placeholder.com/128x192?text=No+Cover",
              smallThumbnail: book.cover_i
                ? `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`
                : "https://via.placeholder.com/128x192?text=No+Cover",
            },
          },
        };
      })
    );

    return books;
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
  ).textContent = `Всього книг: ${allBooksData.length}`;

  initModalLogic();
  initThemeToggle();
  initHeaderShadowOnScroll();
  renderCart();
  initCartModal();
}

function makePageForBooks(bookList, updateSelect = true) {
  const rootElem = document.getElementById("root");
  rootElem.innerHTML = "";

  currentDisplayList = bookList;

  const selectElem = document.getElementById("episodeSelect");

  if (updateSelect) {
    selectElem.innerHTML = "<option value='-1'>Оберіть книгу</option>";

    allBooksData.forEach((book) => {
      const option = document.createElement("option");
      option.value = book.id.toString();
      option.textContent = book.volumeInfo.title;
      selectElem.appendChild(option);
    });
  }

  const paginatedBooks = paginateBooks(bookList);

  paginatedBooks.forEach(displayBook);
  enhanceBookCards();
  renderPagination(bookList);
}

function paginateBooks(bookList) {
  const start = (currentPage - 1) * booksPerPage;
  const end = start + booksPerPage;

  return bookList.slice(start, end);
}

function renderPagination(bookList) {
  const pagination = document.getElementById("pagination");
  if (!pagination) return;

  pagination.innerHTML = "";

  const totalPages = Math.ceil(bookList.length / booksPerPage);

  if (totalPages <= 1) return;

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "←";
  prevBtn.className = "pagination-button";
  prevBtn.disabled = currentPage === 1;

  prevBtn.addEventListener("click", () => {
    currentPage--;
    makePageForBooks(bookList, false);
  });

  pagination.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "pagination-button";

    if (i === currentPage) {
      btn.classList.add("active");
    }

    btn.addEventListener("click", () => {
      currentPage = i;
      makePageForBooks(bookList, false);
    });

    pagination.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "→";
  nextBtn.className = "pagination-button";
  nextBtn.disabled = currentPage === totalPages;

  nextBtn.addEventListener("click", () => {
    currentPage++;
    makePageForBooks(bookList, false);
  });

  pagination.appendChild(nextBtn);
}

function displayBook(book) {
  const { volumeInfo } = book;

  const title = volumeInfo.title || "Назва відсутня";
  const authors = volumeInfo.authors
    ? volumeInfo.authors.join(", ")
    : "Автор невідомий";

  const overview = volumeInfo.description || "Опис відсутній";

  const placeholderUrl = "https://via.placeholder.com/128x192?text=No+Cover";

  const imageUrl = volumeInfo.imageLinks
    ? volumeInfo.imageLinks.thumbnail ||
      volumeInfo.imageLinks.smallThumbnail ||
      placeholderUrl
    : placeholderUrl;

  const bookCard = document.createElement("div");
  bookCard.className = "episode-item";
  bookCard.dataset.bookId = book.id;

  bookCard.innerHTML = `
    <a href="${volumeInfo.infoLink}" target="_blank" class="book-link-wrapper">
      <h3 class="episode-title">${title}</h3>
    </a>

    <img class="episode-image" src="${imageUrl}" alt="Обкладинка книги ${title}">

    <p class="episode-authors">Автор(и): ${authors}</p>

    <p class="episode-year">Рік першої публікації: ${
      volumeInfo.publishedDate || "Невідомо"
    }</p>

    <p class="episode-summary" hidden>${overview}</p>
  `;

  document.getElementById("root").appendChild(bookCard);
}

function handleReset() {
  document.getElementById("searchInput").value = "";
  document.getElementById("episodeSelect").value = "-1";
  document.getElementById("sortSelect").value = "none";

  currentPage = 1;

  const searchCountElem = document.getElementById("searchCount");
  searchCountElem.textContent = `Всього книг: ${allBooksData.length}`;

  const sortedList = applySort(allBooksData);
  makePageForBooks(sortedList, true);
}

function handleSort() {
  currentPage = 1;

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
  }

  if (searchTerm) {
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
  }

  return allBooksData;
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
      return (infoA.title || "").localeCompare(infoB.title || "");
    }

    if (sortCriterion === "author") {
      const authorA = (infoA.authors && infoA.authors[0]) || "";
      const authorB = (infoB.authors && infoB.authors[0]) || "";
      return authorA.localeCompare(authorB);
    }

    if (sortCriterion === "year_desc" || sortCriterion === "year_asc") {
      const yearA = parseInt(infoA.publishedDate || "0") || 0;
      const yearB = parseInt(infoB.publishedDate || "0") || 0;

      return sortCriterion === "year_desc" ? yearB - yearA : yearA - yearB;
    }

    return 0;
  });

  return sortedList;
}

function handleSearch() {
  document.getElementById("episodeSelect").value = "-1";

  currentPage = 1;

  const filteredBooks = getDisplayList();

  const searchCountElem = document.getElementById("searchCount");
  searchCountElem.textContent = `Знайдено книг: ${filteredBooks.length} / ${allBooksData.length}`;

  const sortedList = applySort(filteredBooks);
  makePageForBooks(sortedList, false);
}

function handleSelectChange() {
  const selectedId = document.getElementById("episodeSelect").value;

  document.getElementById("searchInput").value = "";

  currentPage = 1;

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

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(book) {
  const isAlreadyInCart = cart.some((item) => item.id === book.id);

  if (isAlreadyInCart) {
    alert("Ця книга вже є в кошику");
    return;
  }

  cart.push(book);
  saveCart();
  renderCart();
  alert("Книгу додано в кошик");
}

function removeFromCart(bookId) {
  cart = cart.filter((item) => item.id !== bookId);
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

function renderCart() {
  const cartList = document.getElementById("cartList");
  const cartCount = document.getElementById("cartCount");
  const clearCartBtn = document.getElementById("clearCartBtn");

  if (cartCount) {
    cartCount.textContent = cart.length;
  }

  if (!cartList) return;

  cartList.innerHTML = "";

  if (cart.length === 0) {
    cartList.innerHTML = "<p class='cart-empty'>Кошик порожній</p>";

    if (clearCartBtn) {
      clearCartBtn.style.display = "none";
    }

    return;
  }

  if (clearCartBtn) {
    clearCartBtn.style.display = "inline-block";
    clearCartBtn.onclick = clearCart;
  }

  cart.forEach((book) => {
    const { volumeInfo } = book;

    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";

    cartItem.innerHTML = `
      <div class="cart-item-info">
        <strong>${volumeInfo.title}</strong>
        <span>${volumeInfo.authors ? volumeInfo.authors.join(", ") : "Автор невідомий"}</span>
      </div>

      <button class="cart-remove-btn" type="button">Видалити</button>
    `;

    const removeBtn = cartItem.querySelector(".cart-remove-btn");

    removeBtn.addEventListener("click", () => {
      removeFromCart(book.id);
    });

    cartList.appendChild(cartItem);
  });
}

function getBookDataFromCard(card) {
  const titleEl = card.querySelector(".episode-title");
  const authorsEl = card.querySelector(".episode-authors");
  const imgEl = card.querySelector(".episode-image");
  const descEl = card.querySelector(".episode-summary");
  const yearEl = card.querySelector(".episode-year");
  const linkEl = card.querySelector(".book-link-wrapper");

  return {
    title: titleEl ? titleEl.textContent.trim() : "Без назви",
    authors: authorsEl ? authorsEl.textContent.trim() : "Автор невідомий",
    image: imgEl ? imgEl.src : "",
    description: descEl ? descEl.textContent.trim() : "Опис відсутній",
    year: yearEl ? yearEl.textContent.trim() : "",
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
  document.getElementById("modalYear").textContent = data.year;

  const img = document.getElementById("modalImage");

  if (data.image) {
    img.src = data.image;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }

  const link = document.getElementById("modalLink");

  if (link) {
    link.href = data.link || "#";
    link.style.display = "inline-block";
  }

  document.body.style.overflow = "hidden";
}

async function shareBookFromCard(card) {
  const data = getBookDataFromCard(card);
  const shareText = `${data.title}\n${data.authors}\n${data.link}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: data.title,
        text: shareText,
        url: data.link,
      });
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(data.link);
      alert("Посилання скопійовано!");
      return;
    }

    prompt("Скопіюйте посилання:", data.link);
  } catch (error) {
    console.error("Помилка поширення:", error);
    prompt("Скопіюйте посилання:", data.link);
  }
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

  if (closeBtn) {
    closeBtn.addEventListener("click", closeBookModal);
  }

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

function initCartModal() {
  const cartToggle = document.getElementById("cartToggle");
  const cartModal = document.getElementById("cartModal");
  const cartCloseBtn = document.getElementById("cartCloseBtn");

  if (!cartToggle || !cartModal) return;

  cartToggle.addEventListener("click", () => {
    cartModal.classList.add("is-open");
    cartModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });

  if (cartCloseBtn) {
    cartCloseBtn.addEventListener("click", closeCartModal);
  }

  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) {
      closeCartModal();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCartModal();
    }
  });
}

function closeCartModal() {
  const cartModal = document.getElementById("cartModal");
  if (!cartModal) return;

  cartModal.classList.remove("is-open");
  cartModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
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

    const cartBtn = document.createElement("button");
    cartBtn.className = "card-button";
    cartBtn.title = "Додати в кошик";
    cartBtn.innerHTML = '<i class="fa-solid fa-cart-shopping"></i>';

    cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const bookId = card.dataset.bookId;
      const book = allBooksData.find((item) => item.id === bookId);

      if (book) {
        addToCart(book);
      }
    });

    const shareBtn = document.createElement("button");
    shareBtn.className = "card-button";
    shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
    shareBtn.title = "Поділитися";
    shareBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await shareBookFromCard(card);
    });

    actions.appendChild(detailsBtn);
    actions.appendChild(cartBtn);
    actions.appendChild(shareBtn);

    card.appendChild(actions);
  });
}

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

function initHeaderShadowOnScroll() {
  const header = document.querySelector(".app-header");
  if (!header) return;

  function updateShadow() {
    if (window.scrollY > 18) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }

  window.addEventListener("scroll", updateShadow);
  updateShadow();
}

const scrollBtn = document.getElementById("scrollTopBtn");

if (scrollBtn) {
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      scrollBtn.style.opacity = "1";
      scrollBtn.style.pointerEvents = "auto";
    } else {
      scrollBtn.style.opacity = "0";
      scrollBtn.style.pointerEvents = "none";
    }
  });

  scrollBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

window.onload = setup;
