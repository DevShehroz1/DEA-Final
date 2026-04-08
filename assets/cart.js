function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener("click", (event) => {
      event.preventDefault();
      const cartItems =
        this.closest("cart-items") || this.closest("cart-drawer-items");
      cartItems.updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define("cart-remove-button", CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce(
      (total, quantityInput) => total + parseInt(quantityInput.value),
      0
    );

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener("change", this.debouncedOnChange.bind(this));
    const gift_form_minicart = document.getElementById("gift_form_minicart");
    if (gift_form_minicart) {
      gift_form_minicart.addEventListener("change", (event) => {
        if (event.currentTarget.checked) {
          this.addGiftwrapCartClick(gift_form_minicart);
        } else {
          this.updateQuantity(event.currentTarget.dataset.index, 0);
        }
      });
    }
    document
      .querySelectorAll(".js-addtocart-page")
      .forEach((upsell) =>
        upsell.addEventListener("click", this.addProductUpSellEvent.bind(this))
      );
  }

  onChange(event) {
    this.updateQuantity(
      event.target.dataset.index,
      event.target.dataset.key,
      event.target.value,
      document.activeElement.getAttribute("name")
    );
  }

  getSectionsToRender() {
    return [
      {
        id: "main-cart-items",
        section: document.getElementById("main-cart-items").dataset.id,
        selector: ".js-contents",
      },
    ];
  }

  updateQuantity(line, key, quantity, name) {
    quantity = quantity ? quantity : 0;
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        if (parsedState.item_count != undefined) {
          document.querySelectorAll(".cart-count").forEach((el) => {
            if (el.classList.contains("cart-count-drawer")) {
              el.innerHTML = `(${parsedState.item_count})`;
            } else {
              el.innerHTML = parsedState.item_count;
            }
          });
          if (document.querySelector("header-total-price")) {
            document
              .querySelector("header-total-price")
              .updateTotal(parsedState);
          }
        }
        const html = new DOMParser().parseFromString(
          parsedState.sections[
            document.getElementById("main-cart-items").dataset.id
          ],
          "text/html"
        );
        if (parsedState.item_count == 0) {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.querySelector("#main-cart-items");
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              "#main-cart-items"
            );
          });
        } else {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document
                .getElementById(section.id)
                .querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });
          const totals = this.getSectionInnerHTML(
            parsedState.sections[
              document.getElementById("main-cart-items").dataset.id
            ],
            ".cart-info .totals"
          );
          const totals_content = document.querySelector(".cart-info .totals");
          if (totals && totals_content) totals_content.innerHTML = totals;
          const cart_gift_html = html.getElementById("gift");
          const cart_gift = document.getElementById("gift");
          if (cart_gift) {
            cart_gift.innerHTML = cart_gift_html.innerHTML;
            const gift_form_minicart =
              document.getElementById("gift_form_minicart");
            if (gift_form_minicart) {
              gift_form_minicart.addEventListener("change", (event) => {
                if (event.currentTarget.checked) {
                  this.addGiftwrapCartClick(gift_form_minicart);
                } else {
                  this.updateQuantity(event.currentTarget.dataset.index, 0);
                }
              });
            }
          }
          const cart_free_ship = document.querySelector(
            "free-ship-progress-bar"
          );
          if (cart_free_ship) {
            cart_free_ship.init(parsedState.items_subtotal_price);
          }
          this.updateLiveRegions(line, key, parsedState.item_count);
        }
        this.disableLoading();
      })
      .catch(() => {
        this.disableLoading();
      })
      .finally(() => {});
  }

  updateLiveRegions(line, key, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemError =
        document.getElementById(`Line-item-error-${line}`) ||
        document.getElementById(`CartDrawer-LineItemError-${line}`);
      const quantityElement =
        document.getElementById(`Quantity-${line}`) ||
        document.getElementById(`Drawer-quantity-${line}`);
      for (var item of document.querySelectorAll(".cart-item__error-text")) {
        item.classList.remove("error");
      }
      lineItemError
        .querySelector(`.cart-item__error-text-${key}`)
        .classList.add("error");
      lineItemError.querySelector(`.cart-item__error-text-${key}`).innerHTML =
        window.cartStrings.quantityError.replace(
          "[quantity]",
          quantityElement.value
        );
    }

    this.currentItemCount = itemCount;
  }

  addGiftwrapCartClick(event) {
    const target = event;
    const variant_id = target.getAttribute("data-variant-id");
    const body = JSON.stringify({
      id: Number(variant_id),
      quantity: 1,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_add_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        fetch("/cart.json")
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll(".cart-count").forEach((el) => {
                if (el.classList.contains("cart-count-drawer")) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count;
                }
              });
              if (document.querySelector("header-total-price")) {
                document.querySelector("header-total-price").updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                "free-ship-progress-bar"
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        const html = new DOMParser().parseFromString(
          parsedState.sections[
            document.getElementById("main-cart-items").dataset.id
          ],
          "text/html"
        );
        if (parsedState.item_count == 0) {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.querySelector(".cart-wrapper");
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              ".cart-wrapper"
            );
          });
        } else {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document
                .getElementById(section.id)
                .querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });

          const totals = this.getSectionInnerHTML(
            parsedState.sections[
              document.getElementById("main-cart-items").dataset.id
            ],
            ".cart-info .totals"
          );
          const totals_content = document.querySelector(".cart-info .totals");
          if (totals && totals_content) totals_content.innerHTML = totals;
          const cart_gift_html = html.getElementById("gift");
          const cart_gift = document.getElementById("gift");
          if (cart_gift) {
            cart_gift.innerHTML = cart_gift_html.innerHTML;
            const gift_form_minicart =
              document.getElementById("gift_form_minicart");
            if (gift_form_minicart) {
              gift_form_minicart.addEventListener("change", (event) => {
                if (event.currentTarget.checked) {
                  this.addGiftwrapCartClick(gift_form_minicart);
                } else {
                  this.updateQuantity(event.currentTarget.dataset.index, 0);
                }
              });
            }
          }
        }
        this.disableLoading();
      })
      .catch(() => {
        this.disableLoading();
      });
  }

  addProductUpSellEvent(event) {
    event.preventDefault();
    const target = event.currentTarget;
    const variant_id = target
      .closest(".product-addtocart-js")
      .getAttribute("data-product-variant-id");
    const body = JSON.stringify({
      id: Number(variant_id),
      quantity: 1,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_add_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        fetch("/cart.json")
          .then((res) => res.json())
          .then((cart) => {
            if (cart.item_count != undefined) {
              document.querySelectorAll(".cart-count").forEach((el) => {
                if (el.classList.contains("cart-count-drawer")) {
                  el.innerHTML = `(${cart.item_count})`;
                } else {
                  el.innerHTML = cart.item_count;
                }
              });
              if (document.querySelector("header-total-price")) {
                document.querySelector("header-total-price").updateTotal(cart);
              }
              const cart_free_ship = document.querySelector(
                "free-ship-progress-bar"
              );
              if (cart_free_ship) {
                cart_free_ship.init(cart.items_subtotal_price);
              }
            }
          })
          .catch((error) => {
            throw error;
          });
        const html = new DOMParser().parseFromString(
          parsedState.sections[
            document.getElementById("main-cart-items").dataset.id
          ],
          "text/html"
        );
        if (parsedState.item_count == 0) {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace = document.querySelector(".cart-wrapper");
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              ".cart-wrapper"
            );
          });
        } else {
          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document
                .getElementById(section.id)
                .querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector
            );
          });

          const totals = this.getSectionInnerHTML(
            parsedState.sections[
              document.getElementById("main-cart-items").dataset.id
            ],
            ".cart__footer .totals"
          );
          const totals_content = document.querySelector(
            ".cart__footer .totals"
          );
          if (totals && totals_content) totals_content.innerHTML = totals;
        }
      })
      .catch(() => {
        this.disableLoading();
      });
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    document.body.classList.add("start", "loading");
    document.activeElement.blur();
  }

  disableLoading() {
    document.body.classList.add("finish");
    setTimeout(function () {
      document.body.classList.remove("start", "loading", "finish");
    }, 500);
  }
}
customElements.define("cart-items", CartItems);

class CartPageUpsell extends CartItems {
  constructor() {
    super();
  }
  init() {
    this.connectedCallback();
  }
  connectedCallback() {
    fetch(this.dataset.url)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement("div");
        html.innerHTML = text;
        const recommendations = html.querySelector(".swiper-wrapper");
        if (recommendations && recommendations.innerHTML.trim().length) {
          this.querySelector(".swiper-wrapper").innerHTML =
            recommendations.innerHTML;
        }
      })
      .finally(() => {
        BlsSettingsSwiper.init();
        BlsLazyloadImg.init();
        document
          .querySelectorAll(".js-addtocart-page")
          .forEach((upsell) =>
            upsell.addEventListener(
              "click",
              this.addProductUpSellEvent.bind(this)
            )
          );
      })
      .catch((e) => {
        console.error(e);
      });
  }
}
customElements.define("minicart-recommendations-page", CartPageUpsell);

if (!customElements.get("cart-note")) {
  customElements.define(
    "cart-note",
    class CartNote extends HTMLElement {
      constructor() {
        super();
        this.addEventListener(
          "change",
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, {
              ...fetchConfig(),
              ...{ body },
            });
          }, 300)
        );
      }
    }
  );
}
