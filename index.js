require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000; // Change this to your desired port
// Replace these with your actual credentials and URLs
const customerName = 'kakelgiganten';
const username = 'api';
const password = '#4rfv-5TGB#';
const storeUuid = 'kakelgiganten-reference-store';

app.use(bodyParser.json());
async function fetchVariantMetafields(variantId, productId) {
    const url = `https://${process.env.apiKey}:${process.env.password}@${process.env.shopName}.myshopify.com/admin/api/${process.env.SHOPIFY_API_VERSION}/products/${productId}/variants/${variantId}/metafields.json`;
    try {
      const response = await axios.get(url);
      return response.data.metafields;
    } catch (error) {
      console.error('Error fetching variant metafields:', error);
      throw error;
    }
  }
  
  // Function to map Shopify variant and metafields to Pricer fields
// Function to map Shopify variant and metafields to Pricer fields
async function mapShopifyDataToPricer(variant, product) {
  const metafields = await fetchVariantMetafields(variant.id, product.id);

  // Extracting and mapping metafields to corresponding Pricer fields
  const findMetafield = (key) => {
    const metafield = metafields.find(m => m.key === key);
    if (!metafield) return null;

    try {
      // Attempt to parse the metafield value as JSON
      const parsedValue = JSON.parse(metafield.value);

      // If it's an array, join its elements into a comma-separated string
      if (Array.isArray(parsedValue)) {
        return parsedValue.join(', ');
      }

      // If it's not an array, return as is
      return parsedValue;
    } catch (error) {
      // If JSON parsing fails, return the original value
      return metafield.value;
    }
  };
  const productTitle = product.title + ' ' + variant.title.replace(/\//g, '');
  const m2area = parseFloat(findMetafield('kvm_i_paket'));
  return {
    itemId: variant.sku.toString(),
    itemName: productTitle,
    price: variant.price,
    properties: {
      DIMENSIONS: findMetafield('nominellt_m_tt_cm_'),
      DURABILITY: findMetafield('varaktighet'),
      EDGE: findMetafield('kant'),
      FLOORHEATING: findMetafield('t_l_golvv_rme') === 'Ja' ? 'Ja' : 'Nej',
      FROSTSAFE: findMetafield('frosts_ker') === 'Ja' ? 'Ja' : 'Nej',
      ITEM_SKU: variant.sku,
      M2_PAKET: m2area,
      ORDER_ITEM: variant.inventory_quantity.toString(),
      ORD_PRICE: variant.compare_at_price,
      PRICE_UNIT: 'kr/m2',
      QUANTITY: findMetafield('antal_per_paket'),
      QUANTITY_M2: m2area,
      STOCK: variant.inventory_quantity.toString(),
      SURFACE: findMetafield('yta'),
      THICKNESS: findMetafield('tjocklek_mm_'),
      USED_FOR: findMetafield('anv_ndningsomr_de'),
      WEB_LINK: `https://365af8-2.myshopify.com/products/${product.handle}` // Modify as needed
    }
  };
}

async function preparePricerUpdateData(webhookData) {
  const pricerItemsPromises = webhookData.variants.map(variant => 
    mapShopifyDataToPricer(variant, webhookData)
  );
  return Promise.all(pricerItemsPromises);
}
// Function to get JWT
async function getJWT() {
  try {
    const url = `https://central-manager.${customerName}.pcm.pricer-plaza.com/api/public/auth/v1/login`;
    const response = await axios.get(url, {
      auth: { username, password },
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });

    if (response.status === 200 && response.data.tokenType === 'JWT') {
      return response.data.token;
    } else {
      throw new Error(`Server response code: ${response.status}, Body: ${response.data}`);
    }
  } catch (error) {
    console.error('Error in getJWT:', error.message);
    throw error;
  }
}

// Function to update Pricer items
async function updatePricerItems(items) {
  try {
    const token = await getJWT();
    const url = `https://${storeUuid}.${customerName}.pcm.pricer-plaza.com/api/public/core/v1/items`;
    const response = await axios.patch(url, items, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("updatePricerItems Response:", response.data);
    return true;
  } catch (error) {
    console.error('Error in updatePricerItems:', error.message);
    throw error;
  }
}

// Route to handle product updates
app.post('/productUpdated', async (req, res) => {
  try {
    const webhookData = req.body;
    // const webhookData = data;
    const pricerItems = await preparePricerUpdateData(webhookData);
    await updatePricerItems(pricerItems);
    res.status(200).send(pricerItems);
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/', async (req, res) => {
  return res.status(200).json({
    message: "All Working!"
  })
})
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
