"use server";

import { revalidatePath } from "next/cache";
import toast from "react-hot-toast";
import Product from "../models/product-model";
import { connectToDB } from "../mongoose";
import { scrapeProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";

export async function scrapeAndStoreProduct(productUrl: string) {
  if (!productUrl) return;

  try {
    connectToDB();

    const scrapedProduct = await scrapeProduct(productUrl);

    if (!scrapedProduct) return;

    let product = scrapedProduct;

    const existingProduct = await Product.findOne({
      url: scrapedProduct.url,
    });

    if (existingProduct) {
      const updatedPriceHistory: any = [
        ...existingProduct.priceHistory,
        { price: scrapedProduct.currentPrice },
      ];

      product = {
        ...scrapedProduct,
        priceHistory: updatedPriceHistory,
        lowestPrice: getLowestPrice(updatedPriceHistory),
        highestPrice: getHighestPrice(updatedPriceHistory),
        averagePrice: getAveragePrice(updatedPriceHistory),
      };
    }

    const newProduct = await Product.findOneAndUpdate(
      { url: scrapedProduct.url },
      product,
      { upsert: true, new: true },
    );

    revalidatePath(`/products/${newProduct._id}`);
  } catch (error: any) {
    toast.error(`Failed to create/update product: ${error.message}`);
  }
}

export async function getProductById(productId: string) {
  try {
    connectToDB();

    const product = await Product.findOne({ _id: productId });

    if (!product) return null;

    return product;
  } catch (error: any) {
    toast.error(`Failed to get product: ${error.message}`);
  }
}

export async function getAllProducts() {
  try {
    connectToDB();

    const products = await Product.find();

    return products;
  } catch (error: any) {
    toast.error(`Failed to get products: ${error.message}`);
  }
}

export async function getSimilarProducts(productId: string) {
  try {
    connectToDB();

    const currentProduct = await Product.findById(productId);

    if (!currentProduct) return null;

    const similarProducts = await Product.find({
      _id: { $ne: productId },
    }).limit(3);

    return similarProducts;
  } catch (error) {
    console.log(error);
  }
}
