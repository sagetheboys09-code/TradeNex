import { describe, it, expect, beforeEach } from "vitest";

interface Product {
  seller: string;
  name: string;
  description: string;
  price: bigint;
  isAuction: boolean;
  auctionEndBlock: bigint;
  highestBid: bigint;
  highestBidder: string | null;
  royaltyRecipient: string;
  royaltyPercent: bigint;
  active: boolean;
}

interface Bid {
  amount: bigint;
}

interface MockContract {
  admin: string;
  paused: boolean;
  listingCounter: bigint;
  products: Map<string, Product>;
  bids: Map<string, Bid>;
  blockHeight: bigint;
  isAdmin(caller: string): boolean;
  setPaused(caller: string, pause: boolean): { value: boolean } | { error: number };
  createListing(
    caller: string,
    name: string,
    description: string,
    price: bigint,
    isAuction: boolean,
    auctionEndBlock: bigint,
    royaltyRecipient: string,
    royaltyPercent: bigint
  ): { value: bigint } | { error: number };
  updateListing(caller: string, productId: bigint, name: string, description: string, price: bigint): { value: boolean } | { error: number };
  deactivateListing(caller: string, productId: bigint): { value: boolean } | { error: number };
  placeBid(caller: string, productId: bigint, amount: bigint): { value: boolean } | { error: number };
  finalizeAuction(caller: string, productId: bigint): { value: boolean } | { error: number };
}

const mockContract: MockContract = {
  admin: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  paused: false,
  listingCounter: 0n,
  products: new Map<string, Product>(),
  bids: new Map<string, Bid>(),
  blockHeight: 100n,

  isAdmin(caller: string) {
    return caller === this.admin;
  },

  setPaused(caller: string, pause: boolean) {
    if (!this.isAdmin(caller)) return { error: 200 };
    this.paused = pause;
    return { value: pause };
  },

  createListing(
    caller: string,
    name: string,
    description: string,
    price: bigint,
    isAuction: boolean,
    auctionEndBlock: bigint,
    royaltyRecipient: string,
    royaltyPercent: bigint
  ) {
    if (this.paused) return { error: 210 };
    if (price <= 0n) return { error: 209 };
    if (royaltyRecipient === "SP000000000000000000002Q6VF78") return { error: 208 };
    if (royaltyPercent > 10000n) return { error: 207 };
    if (isAuction && auctionEndBlock <= this.blockHeight) return { error: 205 };
    const productId = this.listingCounter + 1n;
    this.products.set(
      productId.toString(),
      {
        seller: caller,
        name,
        description,
        price,
        isAuction,
        auctionEndBlock: isAuction ? auctionEndBlock : 0n,
        highestBid: 0n,
        highestBidder: null,
        royaltyRecipient,
        royaltyPercent,
        active: true
      }
    );
    this.listingCounter = productId;
    return { value: productId };
  },

  updateListing(caller: string, productId: bigint, name: string, description: string, price: bigint) {
    if (this.paused) return { error: 210 };
    const product = this.products.get(productId.toString());
    if (!product) return { error: 201 };
    if (product.seller !== caller) return { error: 200 };
    if (!product.active) return { error: 203 };
    if (price <= 0n) return { error: 209 };
    this.products.set(productId.toString(), { ...product, name, description, price });
    return { value: true };
  },

  deactivateListing(caller: string, productId: bigint) {
    if (this.paused) return { error: 210 };
    const product = this.products.get(productId.toString());
    if (!product) return { error: 201 };
    if (product.seller !== caller) return { error: 200 };
    if (!product.active) return { error: 203 };
    this.products.set(productId.toString(), { ...product, active: false });
    return { value: true };
  },

  placeBid(caller: string, productId: bigint, amount: bigint) {
    if (this.paused) return { error: 210 };
    const product = this.products.get(productId.toString());
    if (!product) return { error: 201 };
    if (!product.isAuction) return { error: 203 };
    if (!product.active) return { error: 203 };
    if (product.auctionEndBlock <= this.blockHeight) return { error: 205 };
    if (amount <= product.highestBid || amount <= product.price) return { error: 204 };
    this.bids.set(`${productId}-${caller}`, { amount });
    this.products.set(productId.toString(), { ...product, highestBid: amount, highestBidder: caller });
    return { value: true };
  },

  finalizeAuction(caller: string, productId: bigint) {
    if (this.paused) return { error: 210 };
    const product = this.products.get(productId.toString());
    if (!product) return { error: 201 };
    if (product.seller !== caller) return { error: 200 };
    if (!product.isAuction) return { error: 203 };
    if (product.auctionEndBlock >= this.blockHeight) return { error: 206 };
    if (!product.active) return { error: 203 };
    this.products.set(productId.toString(), { ...product, active: false });
    return { value: true };
  }
};

describe("TradeNex Product Listing Contract", () => {
  beforeEach(() => {
    mockContract.admin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
    mockContract.paused = false;
    mockContract.listingCounter = 0n;
    mockContract.products = new Map();
    mockContract.bids = new Map();
    mockContract.blockHeight = 100n;
  });

  it("should create a fixed-price listing", () => {
    const result = mockContract.createListing(
      "ST2CY5...",
      "Laptop",
      "High-end gaming laptop",
      1000n,
      false,
      0n,
      "ST3NB...",
      500n
    );
    expect(result).toEqual({ value: 1n });
    const product = mockContract.products.get("1");
    expect(product).toEqual({
      seller: "ST2CY5...",
      name: "Laptop",
      description: "High-end gaming laptop",
      price: 1000n,
      isAuction: false,
      auctionEndBlock: 0n,
      highestBid: 0n,
      highestBidder: null,
      royaltyRecipient: "ST3NB...",
      royaltyPercent: 500n,
      active: true
    });
  });

  it("should create an auction listing", () => {
    const result = mockContract.createListing(
      "ST2CY5...",
      "Artwork",
      "Unique digital art",
      500n,
      true,
      150n,
      "ST3NB...",
      1000n
    );
    expect(result).toEqual({ value: 1n });
    const product = mockContract.products.get("1");
    expect(product?.isAuction).toBe(true);
    expect(product?.auctionEndBlock).toBe(150n);
  });

  it("should prevent creating listing with zero price", () => {
    const result = mockContract.createListing(
      "ST2CY5...",
      "Laptop",
      "High-end gaming laptop",
      0n,
      false,
      0n,
      "ST3NB...",
      500n
    );
    expect(result).toEqual({ error: 209 });
  });

  it("should allow seller to update listing", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Laptop",
      "High-end gaming laptop",
      1000n,
      false,
      0n,
      "ST3NB...",
      500n
    );
    const result = mockContract.updateListing(
      "ST2CY5...",
      1n,
      "Updated Laptop",
      "Refurbished gaming laptop",
      1200n
    );
    expect(result).toEqual({ value: true });
    const product = mockContract.products.get("1");
    expect(product?.name).toBe("Updated Laptop");
    expect(product?.price).toBe(1200n);
  });

  it("should prevent non-seller from updating listing", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Laptop",
      "High-end gaming laptop",
      1000n,
      false,
      0n,
      "ST3NB...",
      500n
    );
    const result = mockContract.updateListing(
      "ST3NB...",
      1n,
      "Updated Laptop",
      "Refurbished gaming laptop",
      1200n
    );
    expect(result).toEqual({ error: 200 });
  });

  it("should allow seller to deactivate listing", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Laptop",
      "High-end gaming laptop",
      1000n,
      false,
      0n,
      "ST3NB...",
      500n
    );
    const result = mockContract.deactivateListing("ST2CY5...", 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.products.get("1")?.active).toBe(false);
  });

  it("should allow bidding on active auction", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Artwork",
      "Unique digital art",
      500n,
      true,
      150n,
      "ST3NB...",
      1000n
    );
    const result = mockContract.placeBid("ST4RE...", 1n, 600n);
    expect(result).toEqual({ value: true });
    const product = mockContract.products.get("1");
    expect(product?.highestBid).toBe(600n);
    expect(product?.highestBidder).toBe("ST4RE...");
  });

  it("should prevent bidding below highest bid", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Artwork",
      "Unique digital art",
      500n,
      true,
      150n,
      "ST3NB...",
      1000n
    );
    mockContract.placeBid("ST4RE...", 1n, 600n);
    const result = mockContract.placeBid("ST5PQ...", 1n, 550n);
    expect(result).toEqual({ error: 204 });
  });

  it("should allow seller to finalize auction after end block", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Artwork",
      "Unique digital art",
      500n,
      true,
      150n,
      "ST3NB...",
      1000n
    );
    mockContract.blockHeight = 151n;
    const result = mockContract.finalizeAuction("ST2CY5...", 1n);
    expect(result).toEqual({ value: true });
    expect(mockContract.products.get("1")?.active).toBe(false);
  });

  it("should prevent finalizing auction before end block", () => {
    mockContract.createListing(
      "ST2CY5...",
      "Artwork",
      "Unique digital art",
      500n,
      true,
      150n,
      "ST3NB...",
      1000n
    );
    const result = mockContract.finalizeAuction("ST2CY5...", 1n);
    expect(result).toEqual({ error: 206 });
  });

  it("should not allow actions when paused", () => {
    mockContract.setPaused(mockContract.admin, true);
    const result = mockContract.createListing(
      "ST2CY5...",
      "Laptop",
      "High-end gaming laptop",
      1000n,
      false,
      0n,
      "ST3NB...",
      500n
    );
    expect(result).toEqual({ error: 210 });
  });
});