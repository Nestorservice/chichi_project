const db = require('./db.js');

async function migrate() {
  const conn = await db.getConnection();
  try {
    console.log('Starting migration for reviews tables...');
    
    // Add has_review column to orders
    try {
      await conn.query(`ALTER TABLE orders ADD COLUMN has_review TINYINT(1) DEFAULT 0`);
      console.log('Column has_review added to orders.');
    } catch (e) {
      if (e.code === 'ER_DUP_COLUMN_NAME' || e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column has_review already exists.');
      } else {
        throw e;
      }
    }

    // Create reviews table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT(20) NOT NULL,
        user_id BIGINT(20) NOT NULL,
        app_rating INT NOT NULL,
        suggestions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table reviews created or verified.');

    // Create product_reviews table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS product_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        product_id BIGINT(20) NOT NULL,
        rating INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('Table product_reviews created or verified.');

    console.log('Migration finished successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await conn.release();
    process.exit(0);
  }
}

migrate();
