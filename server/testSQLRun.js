const sqlite3 = require('sqlite3').verbose();

const runQuery = async (db, sql) => {
    // Split by semicolon, filter out empty statements
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    if (statements.length === 0) return [];
    
    let lastResult = [];
    
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (i === statements.length - 1) {
            // Last statement: use db.all to fetch results
            lastResult = await new Promise((resolve, reject) => {
                db.all(stmt, [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                });
            });
        } else {
            // Intermediate statements: use db.run to execute without returning rows
            await new Promise((resolve, reject) => {
                db.run(stmt, [], function(err) {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }
    }
    return lastResult;
};

const main = async () => {
    const db = new sqlite3.Database(':memory:');
    try {
        await new Promise((resolve, reject) => {
            db.exec('CREATE TABLE test (id INT); INSERT INTO test VALUES (1);', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        console.log("Running simple select");
        const res1 = await runQuery(db, 'SELECT * FROM test');
        console.log(res1);
        
        console.log("Running multiple");
        const res2 = await runQuery(db, 'UPDATE test SET id = 2; SELECT * FROM test');
        console.log(res2);
        
        console.log("Running invalid");
        const res3 = await runQuery(db, 'SELEC * FROM test');
        console.log(res3);
    } catch (e) {
        console.log("Error:", e);
    } finally {
        db.close();
    }
}
main();
