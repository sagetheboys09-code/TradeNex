;; TradeNex Product Listing Contract
;; Clarity v2
;; Manages product listings, auctions, fixed-price sales, and royalties for the TradeNex marketplace

(define-constant ERR-NOT-AUTHORIZED u200)
(define-constant ERR-INVALID-PRODUCT u201)
(define-constant ERR-ALREADY-LISTED u202)
(define-constant ERR-NOT-LISTED u203)
(define-constant ERR-INVALID-BID u204)
(define-constant ERR-AUCTION-ENDED u205)
(define-constant ERR-AUCTION-NOT-ENDED u206)
(define-constant ERR-INVALID-ROYALTY u207)
(define-constant ERR-ZERO-ADDRESS u208)
(define-constant ERR-INVALID-PRICE u209)
(define-constant ERR-PAUSED u210)

;; Contract state
(define-data-var admin principal tx-sender)
(define-data-var paused bool false)
(define-data-var listing-counter uint u0)

;; Product data structure
(define-map products
  { product-id: uint }
  {
    seller: principal,
    name: (string-utf8 100),
    description: (string-utf8 500),
    price: uint, ;; in NEX tokens (fixed price or auction starting price)
    is-auction: bool,
    auction-end-block: uint,
    highest-bid: uint,
    highest-bidder: (optional principal),
    royalty-recipient: principal,
    royalty-percent: uint, ;; percentage * 100 (e.g., 500 = 5%)
    active: bool
  }
)

;; Bids for auctions
(define-map bids
  { product-id: uint, bidder: principal }
  { amount: uint }
)

;; Private helper: is-admin
(define-private (is-admin)
  (is-eq tx-sender (var-get admin))
)

;; Private helper: ensure not paused
(define-private (ensure-not-paused)
  (asserts! (not (var-get paused)) (err ERR-PAUSED))
)

;; Private helper: validate royalty percentage
(define-private (is-valid-royalty (percent uint))
  (and (>= percent u0) (<= percent u10000)) ;; 0% to 100%
)

;; Transfer admin rights
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (asserts! (not (is-eq new-admin 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (var-set admin new-admin)
    (ok true)
  )
)

;; Pause/unpause the contract
(define-public (set-paused (pause bool))
  (begin
    (asserts! (is-admin) (err ERR-NOT-AUTHORIZED))
    (var-set paused pause)
    (ok pause)
  )
)

;; Create a new product listing (fixed price or auction)
(define-public (create-listing
  (name (string-utf8 100))
  (description (string-utf8 500))
  (price uint)
  (is-auction bool)
  (auction-end-block uint)
  (royalty-recipient principal)
  (royalty-percent uint))
  (begin
    (ensure-not-paused)
    (asserts! (> price u0) (err ERR-INVALID-PRICE))
    (asserts! (not (is-eq royalty-recipient 'SP000000000000000000002Q6VF78)) (err ERR-ZERO-ADDRESS))
    (asserts! (is-valid-royalty royalty-percent) (err ERR-INVALID-ROYALTY))
    (if is-auction
      (asserts! (> auction-end-block block-height) (err ERR-AUCTION-ENDED))
      true
    )
    (let ((product-id (+ (var-get listing-counter) u1)))
      (map-set products
        { product-id: product-id }
        {
          seller: tx-sender,
          name: name,
          description: description,
          price: price,
          is-auction: is-auction,
          auction-end-block: (if is-auction auction-end-block u0),
          highest-bid: u0,
          highest-bidder: none,
          royalty-recipient: royalty-recipient,
          royalty-percent: royalty-percent,
          active: true
        }
      )
      (var-set listing-counter product-id)
      (ok product-id)
    )
  )
)

;; Update a product listing (only by seller)
(define-public (update-listing
  (product-id uint)
  (name (string-utf8 100))
  (description (string-utf8 500))
  (price uint))
  (begin
    (ensure-not-paused)
    (let ((product (map-get? products { product-id: product-id })))
      (asserts! (is-some product) (err ERR-INVALID-PRODUCT))
      (asserts! (is-eq (get seller (unwrap-panic product)) tx-sender) (err ERR-NOT-AUTHORIZED))
      (asserts! (> price u0) (err ERR-INVALID-PRICE))
      (asserts! (get active (unwrap-panic product)) (err ERR-NOT-LISTED))
      (map-set products
        { product-id: product-id }
        (merge (unwrap-panic product) { name: name, description: description, price: price }))
      (ok true)
    )
  )
)

;; Deactivate a listing (only by seller)
(define-public (deactivate-listing (product-id uint))
  (begin
    (ensure-not-paused)
    (let ((product (map-get? products { product-id: product-id })))
      (asserts! (is-some product) (err ERR-INVALID-PRODUCT))
      (asserts! (is-eq (get seller (unwrap-panic product)) tx-sender) (err ERR-NOT-AUTHORIZED))
      (asserts! (get active (unwrap-panic product)) (err ERR-NOT-LISTED))
      (map-set products
        { product-id: product-id }
        (merge (unwrap-panic product) { active: false }))
      (ok true)
    )
  )
)

;; Place a bid on an auction
(define-public (place-bid (product-id uint) (amount uint))
  (begin
    (ensure-not-paused)
    (let ((product (map-get? products { product-id: product-id })))
      (asserts! (is-some product) (err ERR-INVALID-PRODUCT))
      (asserts! (get is-auction (unwrap-panic product)) (err ERR-NOT-LISTED))
      (asserts! (get active (unwrap-panic product)) (err ERR-NOT-LISTED))
      (asserts! (<= block-height (get auction-end-block (unwrap-panic product))) (err ERR-AUCTION-ENDED))
      (asserts! (> amount (get highest-bid (unwrap-panic product))) (err ERR-INVALID-BID))
      (asserts! (> amount (get price (unwrap-panic product))) (err ERR-INVALID-BID))
      (map-set bids
        { product-id: product-id, bidder: tx-sender }
        { amount: amount }
      )
      (map-set products
        { product-id: product-id }
        (merge (unwrap-panic product)
          { highest-bid: amount, highest-bidder: (some tx-sender) }))
      (ok true)
    )
  )
)

;; Finalize an auction (called by seller after auction ends)
(define-public (finalize-auction (product-id uint))
  (begin
    (ensure-not-paused)
    (let ((product (map-get? products { product-id: product-id })))
      (asserts! (is-some product) (err ERR-INVALID-PRODUCT))
      (asserts! (is-eq (get seller (unwrap-panic product)) tx-sender) (err ERR-NOT-AUTHORIZED))
      (asserts! (get is-auction (unwrap-panic product)) (err ERR-NOT-LISTED))
      (asserts! (> block-height (get auction-end-block (unwrap-panic product))) (err ERR-AUCTION-NOT-ENDED))
      (asserts! (get active (unwrap-panic product)) (err ERR-NOT-LISTED))
      (map-set products
        { product-id: product-id }
        (merge (unwrap-panic product) { active: false }))
      (ok true)
    )
  )
)

;; Read-only: get product details
(define-read-only (get-product (product-id uint))
  (ok (map-get? products { product-id: product-id }))
)

;; Read-only: get bid details
(define-read-only (get-bid (product-id uint) (bidder principal))
  (ok (map-get? bids { product-id: product-id, bidder: bidder }))
)

;; Read-only: get listing counter
(define-read-only (get-listing-counter)
  (ok (var-get listing-counter))
)

;; Read-only: get admin
(define-read-only (get-admin)
  (ok (var-get admin))
)

;; Read-only: check if paused
(define-read-only (is-paused)
  (ok (var-get paused))
)