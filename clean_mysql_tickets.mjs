import { getMysqlPool } from './server/mysql.js';

const pool = await getMysqlPool();
const [rows] = await pool.query('SELECT * FROM kivo_support_tickets');
console.log('Tickets in MySQL:', rows.length);
if (rows.length > 0) {
  console.log('Ticket IDs:', rows.map(r => r.id));
  await pool.query('DELETE FROM kivo_support_tickets WHERE id LIKE ? OR id LIKE ?', ['TEST%', 'KIVO%']);
  console.log('Cleaned test tickets from MySQL.');
}
const [after] = await pool.query('SELECT * FROM kivo_support_tickets');
console.log('Tickets in MySQL after cleanup:', after.length);
process.exit(0);
