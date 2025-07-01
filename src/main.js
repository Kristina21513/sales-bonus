/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Находим соответствующий товар в чеке по SKU
    const item = purchase.items.find(i => i.sku === _product.sku);
    if (!item) return 0;
    
    const cost = _product.purchase_price * item.quantity;
    const revenue = item.sale_price * item.quantity * (1 - item.discount/100);
    const profit = revenue - cost; 
    return +profit.toFixed(2); 
}


/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
        // Рассчитываем общую прибыль продавца
        const totalProfit = seller.totalProfit || 0;
        
        if (index === 0) return +(totalProfit * 0.15).toFixed(2);      // 15% для 1 места
        if (index === 1 || index === 2) return +(totalProfit * 0.10).toFixed(2); // 10% для 2-3 мест
        if (index === total - 1) return 0;                             // 0% для последнего
        return +(totalProfit * 0.05).toFixed(2);                       // 5% для остальных
    }
   
   
/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
    if (!data || 
        !Array.isArray(data.sellers) || 
        !Array.isArray(data.products) || 
        !Array.isArray(data.purchase_records) ||
        data.sellers.length === 0 || 
        data.products.length === 0 || 
        data.purchase_records.length === 0) {
        throw new Error("Invalid input data");
    }

    // @TODO: Проверка наличия опций
    if (typeof options !== "object" || options === null) {
        throw new Error("Options must be an object");
    }
    
     const { 
     calculateRevenue: calculateSimpleRevenue,
     calculateBonus: calculateBonusByProfit 
     } = options;
    if (typeof calculateSimpleRevenue !== "function" || typeof calculateBonusByProfit !== "function") {
        throw new Error("Required functions are missing in options");
    }

    // @TODO: Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        sellerId: seller.id,
        fullName: `${seller.first_name} ${seller.last_name}`,
        position: seller.position,
        salesCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        productsSold: {} // {sku: {quantity: number, name: string}}
    }));

    // @TODO: Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = data.sellers.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});
        

    // @TODO: Расчет выручки и прибыли для каждого продавца
   
        // Обработка всех чеков для расчета выручки и прибыли
    data.purchase_records.forEach(purchase => {
        // Находим продавца в статистике
    const sellerStat = sellerStats.find(s => s.sellerId === purchase.seller_id);
        if (!sellerStat) return; // Пропускаем если продавец не найден

        // Увеличиваем счетчик продаж
    sellerStat.salesCount += 1;
        
        // Обрабатываем каждый товар в чеке
    purchase.items.forEach(item => {
         // Находим карточку товара по SKU
    const product = productIndex[item.sku];
            if (!product) return; // Пропускаем если товар не найден

            // 1. Рассчитываем себестоимость товаров
    const cost = product.purchase_price * item.quantity;
            
            // 2. Рассчитываем выручку с учетом скидки
    const discountMultiplier = 1 - (item.discount / 100);
    const revenue = item.sale_price * item.quantity * discountMultiplier;
            
            // 3. Рассчитываем прибыль по товару
    const profit = revenue - cost;
            
            // 4. Обновляем общую прибыль продавца
    sellerStat.totalProfit += profit;
            
            // 5. Обновляем общую выручку продавца
    sellerStat.totalRevenue += revenue;
      });
    });
            
    // @TODO: Сортировка продавцов по прибыли
    sellerStats.sort((a, b) => b.totalProfit - a.totalProfit);

    // @TODO: Назначение премий на основе ранжирования
    // Назначение бонусов и формирование топ-10 товаров
    sellerStats.forEach((seller, index, array) => {
        // Расчет бонуса
        seller.totalBonus = calculateBonusByProfit(index, array.length, seller);
        
        // Формирование топ-10 товаров
        seller.topProducts = Object.entries(seller.productsSold)
            .map(([sku, data]) => ({
                sku,
                name: data.name,
                quantity: data.quantity,
                revenue: +(calculateSimpleRevenue(
                    { items: [{ sku, quantity: data.quantity, sale_price: productIndex[sku]?.sale_price || 0, discount: 0 }] },
                    productIndex[sku] || { purchase_price: 0 }
                ).toFixed(2))
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // @TODO: Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.sellerId,
        name: seller.fullName,
        revenue: +seller.totalRevenue.toFixed(2),
        profit: +seller.totalProfit.toFixed(2),
        sales_count: seller.salesCount,
        top_products: seller.topProducts,
        bonus: seller.totalBonus
    }));
}

