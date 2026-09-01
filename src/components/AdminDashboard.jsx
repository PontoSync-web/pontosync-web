 // No AdminDashboard.jsx, adicione um novo card:
<div className="bg-purple-900 p-4 rounded-lg">
  <p className="text-gray-400 text-sm">Banco de Horas Total</p>
  <p className="text-2xl font-bold text-purple-400">
    {stats.totalBancoHoras || 0}h
  </p>
  <p className="text-xs text-gray-500">
    Excedentes: {stats.totalExcedentes || 0}h | Débitos: {stats.totalDebito || 0}h
  </p>
</div>
