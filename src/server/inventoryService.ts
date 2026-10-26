import { Database } from 'sql.js';
import { InventoryItem, OrderItemInput, RecipeBOM } from './types.js';

export class InventoryService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Deducts raw ingredients based on Recipe Bill of Materials (BOM)
   */
  public deductRecipeStock(items: OrderItemInput[]): void {
    for (const item of items) {
      // Find all ingredients for this menu item
      const res = this.db.exec(
        `SELECT ingredient_id, quantity_required FROM recipe_bom WHERE item_id = ?`,
        [item.item_id]
      );

      if (!res[0] || !res[0].values) continue;

      for (const row of res[0].values) {
        const ingredientId = row[0] as string;
        const qtyPerItem = row[1] as number;
        const totalDeduction = qtyPerItem * item.quantity;

        this.db.run(
          `UPDATE inventory_items 
           SET current_stock = MAX(0, current_stock - ?),
               updated_at = CURRENT_TIMESTAMP
           WHERE ingredient_id = ?`,
          [totalDeduction, ingredientId]
        );
      }

      // If takeaway/delivery, also deduct 1 packaging box per line item
      this.db.run(
        `UPDATE inventory_items 
         SET current_stock = MAX(0, current_stock - ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE ingredient_id = 'ing-box'`,
        [item.quantity]
      );
    }
  }

  /**
   * Restores raw ingredients if an order is voided or cancelled
   */
  public restoreRecipeStock(items: OrderItemInput[]): void {
    for (const item of items) {
      const res = this.db.exec(
        `SELECT ingredient_id, quantity_required FROM recipe_bom WHERE item_id = ?`,
        [item.item_id]
      );

      if (!res[0] || !res[0].values) continue;

      for (const row of res[0].values) {
        const ingredientId = row[0] as string;
        const qtyPerItem = row[1] as number;
        const totalRestoration = qtyPerItem * item.quantity;

        this.db.run(
          `UPDATE inventory_items 
           SET current_stock = current_stock + ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE ingredient_id = ?`,
          [totalRestoration, ingredientId]
        );
      }

      this.db.run(
        `UPDATE inventory_items 
         SET current_stock = current_stock + ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE ingredient_id = 'ing-box'`,
        [item.quantity]
      );
    }
  }

  /**
   * Lists all raw materials with reorder warnings
   */
  public getInventoryStatus(): (InventoryItem & { is_low_stock: boolean })[] {
    const res = this.db.exec(`
      SELECT ingredient_id, name, unit, current_stock, reorder_level, cost_per_unit, updated_at
      FROM inventory_items
      ORDER BY name ASC
    `);

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => {
      const current_stock = Number(row[3]);
      const reorder_level = Number(row[4]);
      return {
        ingredient_id: String(row[0]),
        name: String(row[1]),
        unit: String(row[2]),
        current_stock,
        reorder_level,
        cost_per_unit: Number(row[5]),
        updated_at: String(row[6]),
        is_low_stock: current_stock <= reorder_level
      };
    });
  }

  /**
   * Restocks a specific ingredient
   */
  public restockIngredient(ingredientId: string, amount: number): void {
    this.db.run(
      `UPDATE inventory_items 
       SET current_stock = current_stock + ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE ingredient_id = ?`,
      [amount, ingredientId]
    );
  }

  /**
   * Returns Recipe BOM map
   */
  public getRecipeBOMList(): RecipeBOM[] {
    const res = this.db.exec(`
      SELECT b.item_id, b.ingredient_id, i.name, i.unit, b.quantity_required
      FROM recipe_bom b
      JOIN inventory_items i ON b.ingredient_id = i.ingredient_id
      ORDER BY b.item_id ASC
    `);

    if (!res[0] || !res[0].values) return [];

    return res[0].values.map((row) => ({
      item_id: String(row[0]),
      ingredient_id: String(row[1]),
      ingredient_name: String(row[2]),
      unit: String(row[3]),
      quantity_required: Number(row[4])
    }));
  }
}
