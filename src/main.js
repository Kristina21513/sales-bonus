/**
 * Функция для расчета прибыли
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
    if (!purchase || !_product) return 0;
    
    // Расчет выручки без учета себестоимости 
    const revenue = purchase.sale_price * purchase.quantity * (1 - ((purchase.discount || 0) / 100));
    return revenue;
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
        if (!seller || typeof seller.totalProfit !== 'number') return 0;
    
        const profit = seller.totalProfit;
    
    if (index === 0) return profit * 0.15;
    if (index === 1 || index === 2) return profit * 0.10;
    if (index === total - 1) return 0;
    return profit * 0.05;
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
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) throw new Error('Empty sellers array');
    if (!Array.isArray(data.products) || data.products.length === 0) throw new Error('Empty products array');
    if (!Array.isArray(data.purchase_records) || data.purchase_records.length === 0) throw new Error('Empty purchase_records array');
    
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

            const revenue = calculateRevenue({
                sale_price: item.sale_price,
                quantity: item.quantity,
                discount: item.discount || 0
            }, product);

            const cost = product.purchase_price * item.quantity;
            const profit = revenue - cost;

            sellerStat.totalRevenue += revenue;
            sellerStat.totalProfit += profit;

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
            bonus: +calculateBonus(sellerStats.indexOf(seller), sellerStats.length, seller).toFixed(2),
            top_products: topProducts
        };
    });
}

