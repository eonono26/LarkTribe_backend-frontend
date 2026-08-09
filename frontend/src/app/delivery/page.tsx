const ZONES = [
  { area: "Nairobi (within the city)", time: "1–2 business days", fee: "From KSh 200" },
  { area: "Nairobi metro (Kiambu, Machakos, Kajiado)", time: "2–3 business days", fee: "From KSh 300" },
  { area: "Major towns (Mombasa, Kisumu, Nakuru, Eldoret)", time: "3–5 business days", fee: "From KSh 400" },
  { area: "Rest of Kenya", time: "4–7 business days", fee: "From KSh 500" },
];

export default function DeliveryPage() {
  return (
    <main className="container-shell py-12 max-w-3xl">
      <h1 className="font-display text-3xl font-black mb-2">Delivery information</h1>
      <p className="text-sm text-neutral-500 mb-8">
        Delivery is handled by individual vendors and partner couriers, so exact times can vary by item.
      </p>

      <div className="overflow-x-auto mb-10">
        <table className="w-full text-sm border border-[var(--color-line)] rounded-lg overflow-hidden">
          <thead className="bg-[var(--color-mist)] text-left">
            <tr>
              <th className="p-3 font-semibold">Area</th>
              <th className="p-3 font-semibold">Estimated time</th>
              <th className="p-3 font-semibold">Fee</th>
            </tr>
          </thead>
          <tbody>
            {ZONES.map((z) => (
              <tr key={z.area} className="border-t border-[var(--color-line)]">
                <td className="p-3">{z.area}</td>
                <td className="p-3">{z.time}</td>
                <td className="p-3">{z.fee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-neutral-700">
        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Order tracking</h2>
          <p>
            Once a vendor ships your order, you'll get a notification and can follow progress from{" "}
            <a href="/account/orders" className="font-semibold underline">My account → Orders</a>.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Multiple vendors, one cart</h2>
          <p>
            If your order includes items from more than one vendor, they may arrive in separate packages on
            different days — each shipment can be tracked individually.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg font-bold text-[var(--color-ink)] mb-2">Cash on delivery</h2>
          <p>Available for eligible orders and locations — have the exact amount ready for the courier at drop-off.</p>
        </section>
      </div>
    </main>
  );
}
