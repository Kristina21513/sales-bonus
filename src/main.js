/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    // Находим соответствующий товар в чеке по SKU
        if (!purchase?.items || !_product) return 0;
        
        const item = purchase.items.find(i => i.sku === _product.sku);
        if (!item) return 0;
    
        const discountedPrice = item.sale_price * (1 - (item.discount || 0) / 100);
        const profit = (discountedPrice - _product.purchase_price) * item.quantity;
        
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
            if (!seller?.totalProfit) return 0;
            
            if (index === 0) return +(seller.totalProfit * 0.15).toFixed(2);
            if (index === 1 || index === 2) return +(seller.totalProfit * 0.10).toFixed(2);
            if (index === total - 1) return 0;
            return +(seller.totalProfit * 0.05).toFixed(2);
        }
   
   
/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // Проверки входных данных
    if (!data || typeof data !== 'object') throw new Error('Invalid input data');
    if (!Array.isArray(data.sellers) || !Array.isArray(data.products) || !Array.isArray(data.purchase_records)) {
        throw new Error('Invalid input data structure');
    }
    
    // Проверка options
    if (!options || typeof options !== 'object') throw new Error('Options must be an object');
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Required functions are missing in options');
    }

    // Подготовка данных
    const sellerStats = data.sellers.map(seller => ({
        sellerId: seller.id,
        fullName: `${seller.first_name} ${seller.last_name}`,
        totalProfit: 0,
        totalRevenue: 0,
        salesCount: 0,
        productsSold: {}
    }));

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    // Обработка чеков
    data.purchase_records.forEach(purchase => {
        const sellerStat = sellerStats.find(s => s.sellerId === purchase.seller_id);
        if (!sellerStat) return;

        sellerStat.salesCount += 1;

        purchase.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const profit = calculateRevenue(purchase, product);
            const revenue = item.sale_price * item.quantity * (1 - (item.discount || 0) / 100);

            sellerStat.totalProfit += profit;
            sellerStat.totalRevenue += revenue;

            // Учет товаров для топ-10
            if (!sellerStat.productsSold[item.sku]) {
                sellerStat.productsSold[item.sku] = 0;
            }
            sellerStat.productsSold[item.sku] += item.quantity;
        });
    });

    // Сортировка по прибыли
    sellerStats.sort((a, b) => b.totalProfit - a.totalProfit);

    // Формирование результата
    return sellerStats.map(seller => {
        // Формирование топ-10 товаров
        const topProducts = Object.entries(seller.productsSold)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([sku, quantity]) => ({ sku, quantity }));

        return {
            seller_id: seller.sellerId,
            name: seller.fullName,
            profit: +seller.totalProfit.toFixed(2),
            revenue: +seller.totalRevenue.toFixed(2),
            sales_count: seller.salesCount,
            bonus: calculateBonus(sellerStats.indexOf(seller), sellerStats.length, seller),
            top_products: topProducts
        };
    });
}

