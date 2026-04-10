class BundleBuilder extends HTMLElement {
  constructor() {
    super();
    this.selectedTierIndex = 0;
    this.designs = [];
    this.tiers = [];
    this.currentSlotIndex = null;
    this.previewProduct = null;
    this.previewSlideIndex = 0;
  }

  connectedCallback() {
    this.tiers = JSON.parse(this.dataset.tiers || '[]');
    this.popup = this.querySelector('.bb-popup');
    this.mainView = this.querySelector('.bb-main-view');
    this.previewView = this.querySelector('.bb-preview');
    this.slotsContainer = this.querySelector('.bb-slots');
    this.summaryBtn = this.querySelector('.bb-summary__btn');
    this.summaryInfo = this.querySelector('.bb-summary__info');
    this.trackFill = this.querySelector('.bb-tiers__track-fill');

    if (this.tiers.length > 0) {
      this.designs = new Array(this.tiers[this.tiers.length - 1].count).fill(null);
    }

    this.bindTiers();
    this.bindPopup();
    this.bindFilters();
    this.bindEscape();
    this.selectTier(0);
    this.updateSummary();
  }

  /* --- Tier Logic --- */
  bindTiers() {
    this.querySelectorAll('.bb-tier').forEach(function(el) {
      el.addEventListener('click', function() {
        this.selectTier(parseInt(el.dataset.index));
      }.bind(this));
    }.bind(this));
  }

  selectTier(index) {
    this.selectedTierIndex = index;
    this.querySelectorAll('.bb-tier').forEach(function(el, i) {
      el.classList.toggle('active', i <= index);
    });
    var pct = index === 0 ? 0 : (index / (this.tiers.length - 1)) * 100;
    if (this.trackFill) this.trackFill.style.width = pct + '%';
    this.renderSlots();
    this.updateSummary();
  }

  /* --- Slot Rendering --- */
  renderSlots() {
    var tier = this.tiers[this.selectedTierIndex];
    var count = tier.count;
    var html = '';
    for (var i = 0; i < count; i++) {
      var design = this.designs[i];
      var discount = this.getSlotDiscount(i);
      if (design) {
        html += '<div class="bb-slot bb-slot--filled" data-index="' + i + '">' +
          '<img src="' + design.image + '" alt="' + design.title + '">' +
          '<button class="bb-slot__remove" data-index="' + i + '">&times;</button>' +
          '<span class="bb-slot__name">' + design.title + '</span>' +
          '</div>';
      } else {
        html += '<div class="bb-slot" data-index="' + i + '">' +
          '<span class="bb-slot__add">+</span>' +
          (discount ? '<span class="bb-slot__discount-label">' + discount + '% off</span>' : '') +
          '<span class="bb-slot__name">Design ' + (i + 1) + '</span>' +
          '</div>';
      }
    }
    this.slotsContainer.innerHTML = html;
    this.bindSlots();
  }

  getSlotDiscount(slotIndex) {
    for (var i = 0; i < this.tiers.length; i++) {
      if (slotIndex < this.tiers[i].count) {
        return this.tiers[i].discount;
      }
    }
    return this.tiers[this.tiers.length - 1].discount;
  }

  bindSlots() {
    var self = this;
    this.slotsContainer.querySelectorAll('.bb-slot:not(.bb-slot--filled)').forEach(function(el) {
      el.addEventListener('click', function() {
        self.currentSlotIndex = parseInt(el.dataset.index);
        self.openPopup();
      });
    });
    this.slotsContainer.querySelectorAll('.bb-slot__remove').forEach(function(el) {
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        var idx = parseInt(el.dataset.index);
        self.designs[idx] = null;
        self.renderSlots();
        self.updateSummary();
      });
    });
  }

  /* --- Popup --- */
  bindPopup() {
    var self = this;
    var overlay = this.querySelector('.bb-popup__overlay');
    if (overlay) overlay.addEventListener('click', function() { self.closePopup(); });

    this.querySelectorAll('.bb-popup__close').forEach(function(el) {
      el.addEventListener('click', function() { self.closePopup(); });
    });

    var backBtn = this.querySelector('.bb-popup__back');
    if (backBtn) backBtn.addEventListener('click', function() { self.showMainView(); });

    var backLink = this.querySelector('.bb-preview__back-link');
    if (backLink) backLink.addEventListener('click', function() { self.showMainView(); });

    // Product cards
    this.querySelectorAll('.bb-product-card').forEach(function(card) {
      var previewBtn = card.querySelector('.bb-product-card__preview');
      if (previewBtn) {
        previewBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          self.openPreview(card.dataset.handle);
        });
      }
      card.addEventListener('click', function() {
        self.selectDesign(card);
      });
    });

    // Preview select button
    var selectBtn = this.querySelector('.bb-preview__select');
    if (selectBtn) {
      selectBtn.addEventListener('click', function() {
        if (self.previewProduct) {
          self.selectDesignByHandle(self.previewProduct);
        }
      });
    }
  }

  bindEscape() {
    var self = this;
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && self.popup.classList.contains('open')) {
        self.closePopup();
      }
    });
  }

  openPopup() {
    this.popup.classList.add('open');
    document.body.style.overflow = 'hidden';
    this.showMainView();
  }

  closePopup() {
    this.popup.classList.remove('open');
    document.body.style.overflow = '';
  }

  showMainView() {
    this.mainView.classList.remove('hidden');
    this.previewView.classList.remove('active');
  }

  /* --- Filters --- */
  bindFilters() {
    var self = this;
    this.querySelectorAll('.bb-filter-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var isActive = btn.classList.contains('active');
        self.querySelectorAll('.bb-filter-btn').forEach(function(b) { b.classList.remove('active'); });
        if (!isActive) btn.classList.add('active');
        var tag = isActive ? null : btn.dataset.filter;
        self.filterProducts(tag);
      });
    });
  }

  filterProducts(tag) {
    this.querySelectorAll('.bb-product-card').forEach(function(card) {
      if (!tag) {
        card.style.display = '';
      } else {
        var tags = (card.dataset.tags || '').toLowerCase();
        card.style.display = tags.includes(tag.toLowerCase()) ? '' : 'none';
      }
    });
  }

  /* --- Design Selection --- */
  selectDesign(card) {
    var design = {
      id: card.dataset.id,
      handle: card.dataset.handle,
      title: card.dataset.title,
      image: card.querySelector('.bb-product-card__img') ? card.querySelector('.bb-product-card__img').src : '',
      shape: card.dataset.shape || '',
      images: JSON.parse(card.dataset.images || '[]')
    };
    if (this.currentSlotIndex !== null) {
      this.designs[this.currentSlotIndex] = design;
    }
    this.closePopup();
    this.renderSlots();
    this.updateSummary();
  }

  selectDesignByHandle(handle) {
    var card = this.querySelector('.bb-product-card[data-handle="' + handle + '"]');
    if (card) this.selectDesign(card);
  }

  /* --- Preview Carousel --- */
  openPreview(handle) {
    var self = this;
    this.previewProduct = handle;
    var card = this.querySelector('.bb-product-card[data-handle="' + handle + '"]');
    if (!card) return;

    var images = JSON.parse(card.dataset.images || '[]');
    var name = card.dataset.title;
    var shape = card.dataset.shape || '';

    this.querySelector('.bb-preview__name').textContent = name;
    this.querySelector('.bb-preview__shape').textContent = shape;

    var slidesEl = this.querySelector('.bb-preview__slides');
    var dotsEl = this.querySelector('.bb-preview__dots');

    slidesEl.innerHTML = images.map(function(src) {
      return '<div class="bb-preview__slide"><img src="' + src + '" alt="' + name + '"></div>';
    }).join('');

    dotsEl.innerHTML = images.map(function(_, i) {
      return '<button class="bb-preview__dot' + (i === 0 ? ' active' : '') + '" data-slide="' + i + '"></button>';
    }).join('');

    this.previewSlideIndex = 0;
    slidesEl.style.transform = 'translateX(0)';

    dotsEl.querySelectorAll('.bb-preview__dot').forEach(function(dot) {
      dot.addEventListener('click', function() {
        self.goToSlide(parseInt(dot.dataset.slide));
      });
    });

    // Rebind arrows
    var prevArrow = this.querySelector('.bb-preview__arrow--prev');
    var nextArrow = this.querySelector('.bb-preview__arrow--next');
    if (prevArrow) {
      var newPrev = prevArrow.cloneNode(true);
      prevArrow.parentNode.replaceChild(newPrev, prevArrow);
      newPrev.addEventListener('click', function() { self.goToSlide(self.previewSlideIndex - 1); });
    }
    if (nextArrow) {
      var newNext = nextArrow.cloneNode(true);
      nextArrow.parentNode.replaceChild(newNext, nextArrow);
      newNext.addEventListener('click', function() { self.goToSlide(self.previewSlideIndex + 1); });
    }

    this.mainView.classList.add('hidden');
    this.previewView.classList.add('active');
  }

  goToSlide(index) {
    var slides = this.querySelectorAll('.bb-preview__slide');
    if (slides.length === 0) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    this.previewSlideIndex = index;
    this.querySelector('.bb-preview__slides').style.transform = 'translateX(-' + (index * 100) + '%)';
    this.querySelectorAll('.bb-preview__dot').forEach(function(d, i) {
      d.classList.toggle('active', i === index);
    });
  }

  /* --- Summary / Discount --- */
  updateSummary() {
    var filled = this.designs.filter(function(d) { return d !== null; }).length;
    var tier = this.tiers[this.selectedTierIndex];
    var needed = tier.count;
    var discount = tier.discount;

    if (this.summaryInfo) {
      if (filled >= needed) {
        this.summaryInfo.innerHTML = '<span>' + discount + '% OFF</span> applied to ' + filled + ' designs';
      } else {
        var remaining = needed - filled;
        this.summaryInfo.innerHTML = 'Select ' + remaining + ' more design' + (remaining > 1 ? 's' : '') + ' for <span>' + discount + '% off</span>';
      }
    }

    if (this.summaryBtn) {
      var minCount = this.tiers[0].count;
      this.summaryBtn.disabled = filled < minCount;
      if (filled >= minCount) {
        this.summaryBtn.textContent = 'ADD BUNDLE TO CART';
      } else {
        this.summaryBtn.textContent = 'SELECT ' + (minCount - filled) + ' MORE';
      }
    }
  }
}

if (!customElements.get('bundle-builder')) {
  customElements.define('bundle-builder', BundleBuilder);
}
