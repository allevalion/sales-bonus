function calculateSimpleRevenue(purchase, _product) {
  const discount = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discount;
}

function calculateBonusByProfit(index, total, seller) {
  if (index === 0) {
    return seller.totalProfit * 0.15;
  } else if (index === 1 || index === 2) {
    return seller.totalProfit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    return seller.totalProfit * 0.05;
  }
}

function analyzeSalesData(data, options) {
  const { calculateRevenue, calculateBonus } = options;

  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  if (!options || typeof options !== "object") {
    throw new Error("Некорректные входные данные: options не объект");
  }

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error(
      "Некорректные входные данные: calculateRevenue или calculateBonus не функции"
    );
  }

  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    firstName: seller.first_name,
    lastName: seller.last_name,
    position: seller.position,
    startDate: seller.start_date,
    totalRevenue: 0,
    totalProfit: 0,
    totalSales: 0,
    totalItems: 0,
    products_sold: {},
    bonus: 0,
    top_products: [],
  }));

  const sellerIndex = sellerStats.reduce(
    (result, seller) => ({
      ...result,
      [seller.id]: seller,
    }),
    {}
  );

  const productIndex = data.products.reduce(
    (result, product) => ({
      ...result,
      [product.sku]: product,
    }),
    {}
  );

  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    seller.totalSales += 1;
    seller.totalRevenue += record.total_amount;

    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      const cost = product.purchase_price * item.quantity;
      const revenue = calculateSimpleRevenue(item, product);
      const profit = revenue - cost;
      seller.totalProfit += profit;

      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }

      seller.products_sold[item.sku] += item.quantity;
    });
  });

  sellerStats.sort((a, b) => b.totalProfit - a.totalProfit);
  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({
        sku,
        name: productIndex[sku]?.name || "Unknown",
        quantity,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: `${seller.firstName} ${seller.lastName}`,
    revenue: +seller.totalRevenue.toFixed(2),
    profit: +seller.totalProfit.toFixed(2),
    sales_count: seller.totalSales,
    top_products: seller.top_products.map((product) => ({
      sku: product.sku,
      quantity: product.quantity,
    })),
    bonus: +seller.bonus.toFixed(2),
  }));
}
