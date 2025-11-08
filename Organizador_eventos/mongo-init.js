
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo-primary:27017" },
    { _id: 1, host: "mongo-secondary-1:27017" },
    { _id: 2, host: "mongo-secondary-2:27017" }
  ]
});

console.log("✅ Conjunto de Réplicas (rs0) iniciado.");

// Espera a que el primary sea elegido
let isPrimary = false;
while (!isPrimary) {
  print("Esperando a que el Primary sea elegido...");
  sleep(1000); // 1 segundo
  let status = rs.status();
  isPrimary = status.members.some(m => m.stateStr === 'PRIMARY');
}

print("🎉 ¡Primary elegido! El cluster está listo.");