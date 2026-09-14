import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, Clock3, Facebook, Instagram, MapPin, Menu, MessageCircle, Phone, ShieldCheck, ShoppingBag, Star, Wrench, X, Zap } from "lucide-react";

const services = [
  { icon: ShieldCheck, title: "Диагностика", text: "Ходовая, двигатель и компьютерная диагностика — чтобы не менять исправное.", price: "от 5 000 ₸", time: "от 30 мин" },
  { icon: Wrench, title: "Ходовая часть", text: "Находим источник стука и возвращаем машине собранность на дороге.", price: "от 8 000 ₸", time: "от 1 часа" },
  { icon: Zap, title: "Двигатель", text: "Бензиновые и дизельные моторы, включая сложные ремонты и сборку.", price: "от 15 000 ₸", time: "по диагностике" },
  { icon: ShoppingBag, title: "Запчасти на месте", text: "Подберём деталь в собственном магазине — без поездок по городу.", price: "под запрос", time: "в день обращения" },
];

const testimonials = [
  { quote: "Приехал со сложной проблемой после двух сервисов. Здесь разобрались и объяснили по-честному, без лишних работ.", name: "Постоянный клиент", meta: "Отзыв на 2GIS" },
  { quote: "Удобно, что деталь сразу нашли в магазине на месте. Машину оставил и забрал уже готовой.", name: "Владелец Toyota", meta: "Отзыв на 2GIS" },
  { quote: "Форсунки промыли быстро, всё показали и рассказали. Теперь езжу только сюда.", name: "Владелец Hyundai", meta: "Отзыв на 2GIS" },
];

const brands = ["LADA", "TOYOTA", "CHERY", "BMW", "MERCEDES", "LEXUS", "PORSCHE"];

const servicePrices: Record<string, string> = {
  "Диагностика": "от 5 000 ₸",
  "Ремонт ходовой части": "от 8 000 ₸",
  "Ремонт двигателя": "от 15 000 ₸",
  "Промывка форсунок": "от 12 000 ₸",
  "Замена масла": "от 4 000 ₸",
  "Ремонт сцепления": "от 30 000 ₸",
  "Электрика": "от 5 000 ₸",
  "Подбор запчастей": "под запрос",
  "Другое": "после диагностики",
};

const WHATSAPP_ASK = `https://wa.me/77478019910?text=${encodeURIComponent("Здравствуйте! У меня вопрос по автосервису «Реактор».")}`;

const pricing = [
  ["Компьютерная диагностика", "от 5 000 ₸", "ориентир: 30–60 мин"],
  ["Диагностика ходовой", "от 3 000 ₸", "ориентир: 30 мин"],
  ["Замена масла", "от 4 000 ₸", "без стоимости масла"],
  ["Промывка форсунок", "от 12 000 ₸", "ориентир: 1–2 часа"],
  ["Ремонт ходовой части", "от 8 000 ₸", "по результатам осмотра"],
  ["Замена ремня ГРМ", "от 25 000 ₸", "без стоимости комплекта"],
  ["Ремонт сцепления", "от 30 000 ₸", "без стоимости деталей"],
  ["Электрика и датчики", "от 5 000 ₸", "по диагностике"],
];

function BookingForm({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(1);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ brand: "", model: "", year: "", phone: "", service: "", problem: "", name: "", channel: "Звонок", telegram: "", consent: false });
  const update = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: "" } : prev));
  };
  const focusField = (key: string) => {
    window.setTimeout(() => document.getElementById(`booking-${key}`)?.focus({ preventScroll: false }), 50);
  };
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").replace(/^8/, "7").slice(0, 11);
    if (!digits) return "";
    const rest = digits.startsWith("7") ? digits.slice(1) : digits;
    return `+7${rest ? ` ${rest.slice(0, 3)}${rest.length > 3 ? ` ${rest.slice(3, 6)}` : ""}${rest.length > 6 ? ` ${rest.slice(6, 8)}` : ""}${rest.length > 8 ? ` ${rest.slice(8, 10)}` : ""}` : ""}`;
  };
  const validateStep = (n: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (n === 1) {
      if (!form.brand) errs.brand = "Выберите марку автомобиля.";
      if (!form.model.trim()) errs.model = "Укажите модель, например Camry.";
    }
    if (n === 2 && !form.service) errs.service = "Выберите услугу, чтобы мы подготовили запись.";
    if (n === 3) {
      if (!form.name.trim()) errs.name = "Представьтесь, пожалуйста.";
      if (form.phone.replace(/\D/g, "").length !== 11) errs.phone = "Введите полный номер: +7 700 000 00 00.";
      if (form.channel === "Telegram" && !/^@?[a-zA-Z0-9_]{5,32}$/.test(form.telegram.trim())) errs.telegram = "Укажите корректный username, например @reaktor_user.";
      if (!form.consent) errs.consent = "Нужно согласие на обработку данных.";
    }
    return errs;
  };
  const next = () => {
    setError("");
    const errs = validateStep(step);
    setFieldErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) { focusField(first); return; }
    setStep((s) => Math.min(3, s + 1));
  };
  const submit = async () => {
    setError("");
    const errs = validateStep(3);
    setFieldErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) { focusField(first); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, servicePrice: servicePrices[form.service] ?? "", source: "site-booking" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSent(true);
    } catch {
      setError("Не удалось отправить заявку — проверьте соединение и попробуйте ещё раз. Или позвоните: +7 747 801-99-10.");
    } finally {
      setSubmitting(false);
    }
  };
  const field = (key: string) => ({
    "aria-invalid": fieldErrors[key] ? true : undefined,
    "aria-describedby": fieldErrors[key] ? `booking-${key}-error` : undefined,
  });
  if (sent) return <div className="booking-success"><div className="success-orbit"><div className="success-icon"><Check size={28} /></div></div><p className="eyebrow">Заявка принята</p><h3>Спасибо, {form.name.trim() || "что выбрали нас"}!</h3><p>Мы получили ваши данные и свяжемся с вами ({form.channel.toLowerCase()}: {form.phone}). Ничего дополнительно делать не нужно.</p><div className="summary"><b>{form.brand} {form.model}{form.year ? ` · ${form.year}` : ""}</b><span>{form.service} · {form.channel}</span></div><p className="success-hours">Мы на связи: Пн–Пт 09:00–18:00, Сб 09:00–14:00.</p><button className="btn btn-primary success-close" onClick={onClose}>Вернуться на сайт <ArrowRight size={17}/></button></div>;
  return <div className="booking-card">
    <div className="booking-head"><div><p className="eyebrow">Онлайн-запись</p><h3>Запишитесь без звонка</h3></div>{onClose && <button className="icon-btn" aria-label="Закрыть форму записи" onClick={onClose}><X size={20}/></button>}</div>
    <div className="steps" aria-hidden="true">{[1,2,3].map((n) => <div key={n} className={`step ${step >= n ? "active" : ""}`}><span>{n}</span><i /></div>)}</div>
    {step === 1 && <div className="form-grid"><label>Марка автомобиля<select id="booking-brand" autoComplete="off" value={form.brand} onChange={(e) => update("brand", e.target.value)} {...field("brand")}><option value="">Выберите марку</option>{brands.map((b) => <option key={b}>{b}</option>)}</select>{fieldErrors.brand && <small className="field-error" id="booking-brand-error">{fieldErrors.brand}</small>}</label><label>Модель<input id="booking-model" autoComplete="off" placeholder="Например, Camry" value={form.model} onChange={(e) => update("model", e.target.value)} {...field("model")} />{fieldErrors.model && <small className="field-error" id="booking-model-error">{fieldErrors.model}</small>}</label><label>Год выпуска <em>необязательно</em><input autoComplete="off" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="2020" value={form.year} onChange={(e) => update("year", e.target.value.replace(/\D/g, "").slice(0, 4))} /></label></div>}
    {step === 2 && <div className="form-grid single"><label>Что нужно сделать<select id="booking-service" value={form.service} onChange={(e) => update("service", e.target.value)} {...field("service")}><option value="">Выберите услугу</option>{Object.keys(servicePrices).map((s) => <option key={s} value={s}>{s} · {servicePrices[s]}</option>)}</select>{fieldErrors.service && <small className="field-error" id="booking-service-error">{fieldErrors.service}</small>}{form.service && !fieldErrors.service && <small className="price-hint">Ориентировочно: <b>{servicePrices[form.service]}</b> · точная стоимость — после диагностики.</small>}</label><label>Опишите проблему <em>необязательно</em><textarea rows={3} placeholder="Например: стук в передней подвеске при поворотах" value={form.problem} onChange={(e) => update("problem", e.target.value)} /><small>Можно описать симптом — мастер уточнит детали при связи.</small></label></div>}
    {step === 3 && <div className="form-grid single"><label>Как к вам обращаться<input id="booking-name" autoComplete="name" placeholder="Ваше имя" value={form.name} onChange={(e) => update("name", e.target.value)} {...field("name")} />{fieldErrors.name && <small className="field-error" id="booking-name-error">{fieldErrors.name}</small>}</label><label>Номер телефона<input id="booking-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 700 000 00 00" value={form.phone} onChange={(e) => { update("phone", formatPhone(e.target.value)); setError(""); }} {...field("phone")} />{fieldErrors.phone && <small className="field-error" id="booking-phone-error">{fieldErrors.phone}</small>}</label><label>Как с вами связаться<div className="channel-row">{["Звонок", "WhatsApp", "Telegram"].map((c) => <button type="button" key={c} className={`channel ${form.channel === c ? "selected" : ""}`} onClick={() => { update("channel", c); setError(""); }}>{c}</button>)}</div></label>{form.channel === "Telegram" && <label>Telegram username<input id="booking-telegram" autoComplete="off" placeholder="@username" value={form.telegram} onChange={(e) => update("telegram", e.target.value)} {...field("telegram")} /><small>Например: @reaktor_user — без ссылки t.me/</small>{fieldErrors.telegram && <small className="field-error" id="booking-telegram-error">{fieldErrors.telegram}</small>}</label>}<label className="check"><input id="booking-consent" type="checkbox" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} aria-describedby={fieldErrors.consent ? "booking-consent-error" : undefined} /> <span>Согласен на обработку персональных данных</span></label>{fieldErrors.consent && <small className="field-error" id="booking-consent-error">{fieldErrors.consent}</small>}</div>}
    {error && <div className="form-error" role="alert"><span>!</span><p>{error}</p></div>}
    <div className="booking-actions">{step > 1 && <button className="btn btn-ghost" disabled={submitting} onClick={() => { setError(""); setFieldErrors({}); setStep((s) => s - 1); }}>Назад</button>}<button className="btn btn-primary" disabled={submitting} aria-busy={submitting} onClick={step === 3 ? submit : next}>{submitting ? <><span className="submit-spinner"/> Отправляем заявку</> : <>{step === 3 ? "Отправить заявку" : "Продолжить"}<ArrowRight size={17}/></>}</button></div>
  </div>;
}

export default function Home() {
  const [bookingOpen, setBookingOpen] = useState(false); const [menuOpen, setMenuOpen] = useState(false); const [showFloatingBook, setShowFloatingBook] = useState(false); const [headerScrolled, setHeaderScrolled] = useState(false);
  useEffect(() => {
    const heroCta = document.querySelector<HTMLElement>("[data-primary-booking]");
    if (!heroCta) return;
    const observer = new IntersectionObserver(([entry]) => setShowFloatingBook(!entry.isIntersecting), { threshold: 0.12 });
    observer.observe(heroCta);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onScroll = () => setHeaderScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("has-floating", showFloatingBook && !bookingOpen);
  }, [showFloatingBook, bookingOpen]);
  useEffect(() => {
    if (!bookingOpen) return;
    document.body.classList.add("modal-open");
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBookingOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.classList.remove("modal-open"); window.removeEventListener("keydown", onKey); };
  }, [bookingOpen]);
  const scrollTo = (id: string) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };
  return <div className="site-shell">
    <header className={`site-header${headerScrolled ? " scrolled" : ""}`}><a className="brand" href="#top" onClick={(e) => { e.preventDefault(); scrollTo("top"); }}><span className="brand-mark"><Zap size={19} fill="currentColor" /></span><span>РЕАКТОР<small>АВТОСЕРВИС · ПЕТРОПАВЛОВСК</small></span></a><nav className={menuOpen ? "open" : ""}><a className="mobile-menu-book" onClick={() => { setBookingOpen(true); setMenuOpen(false); }}>Записаться онлайн <ArrowRight size={16}/></a><a href="#services" onClick={(e) => { e.preventDefault(); scrollTo("services"); }}>Услуги</a><a href="#pricing" onClick={(e) => { e.preventDefault(); scrollTo("pricing"); }}>Цены</a><a href="#faq" onClick={(e) => { e.preventDefault(); scrollTo("faq"); }}>FAQ</a><a href="#process" onClick={(e) => { e.preventDefault(); scrollTo("process"); }}>Как работаем</a><a href="#contacts" onClick={(e) => { e.preventDefault(); scrollTo("contacts"); }}>Контакты</a></nav><div className="header-actions"><a className="phone-link" href="tel:+77478019910"><Phone size={16}/> +7 747 801-99-10</a><button data-booking-cta className="btn btn-primary header-cta" onClick={() => setBookingOpen(true)}>Записаться <ArrowRight size={16}/></button><button className="menu-btn" aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button></div></header>
    <main id="top">
      <section className="hero"><div className="hero-bg"/><div className="hero-overlay"/><div className="container hero-content"><div className="hero-copy"><p className="eyebrow light"><span/> АВТОСЕРВИС И МАГАЗИН ЗАПЧАСТЕЙ</p><h1>Берёмся за&nbsp;то,<br/><i>от чего отказались другие.</i></h1><p className="hero-text">Диагностируем честно. Ремонтируем по делу.<br/>Запчасти — тут же, на месте.</p><div className="hero-buttons"><button data-primary-booking className="btn btn-primary" onClick={() => setBookingOpen(true)}>Записаться онлайн <ArrowRight size={18}/></button><button className="btn btn-outline-light" onClick={() => scrollTo("services")}>Смотреть услуги</button></div><div className="hero-utilities"><a href="tel:+77478019910"><Phone size={15}/> Позвонить</a><a href="https://2gis.kz/petropavlovsk/firm/70000001038459364?m=69.14079%2C54.878543%2F16" target="_blank" rel="noreferrer"><MapPin size={15}/> Маршрут в 2GIS</a></div><div className="hero-note"><Check size={16}/> Точная стоимость — после диагностики. Без навязанных работ.</div></div><div className="hero-fact"><span>Рейтинг на 2GIS</span><strong>4.5 <Star size={18} fill="currentColor"/></strong><small>73 оценки · 43 отзыва</small></div></div><div className="scroll-cue">ЛИСТАЙТЕ <span/></div></section>
      <section className="trust-bar"><div className="container"><h2 className="trust-heading">За что возвращаются <i>снова и снова.</i></h2><div className="trust-inner"><div><strong>Сложные случаи</strong><span>не боимся нестандартных задач</span></div><div><strong>Всё в одном месте</strong><span>сервис + магазин запчастей</span></div><div><strong>Честная диагностика</strong><span>чинить только то, что сломано</span></div><div><strong>Быстрые работы</strong><span>типовые — в течение визита</span></div></div></div></section>
      <section id="services" className="section services-section"><div className="container"><div className="section-intro"><div><p className="eyebrow">Что делаем</p><h2>От первого сигнала<br/><i>до готового автомобиля.</i></h2></div><p>Обслуживаем практически весь модельный ряд — от Lada и Chery до BMW, Mercedes, Lexus и Porsche.</p></div><div className="service-grid">{services.map(({ icon: Icon, ...s }) => <article className="service-card" key={s.title}><div className="service-icon"><Icon size={24}/></div><h3>{s.title}</h3><p>{s.text}</p><div className="service-meta"><span>{s.price}</span><span><Clock3 size={14}/>{s.time}</span></div><button onClick={() => setBookingOpen(true)}>Записаться <ArrowUpRightIcon/></button></article>)}</div><div className="all-services"><span>Также: масло · ГРМ · сцепление · электрика · форсунки</span><button onClick={() => setBookingOpen(true)}>Подобрать услугу <ArrowRight size={16}/></button></div></div></section>
      <section id="pricing" className="section pricing-section"><div className="container"><div className="section-intro"><div><p className="eyebrow">Ориентиры по стоимости</p><h2>Понятные цены<br/><i>до визита.</i></h2></div><p>Предварительный ориентир для планирования. Точная стоимость зависит от автомобиля, объёма работ и деталей.</p></div><div className="price-table">{pricing.map(([title, price, note]) => <div className="price-row" key={title}><span className="price-title">{title}</span><strong>{price}</strong><small>{note}</small><button onClick={() => setBookingOpen(true)} aria-label={`Записаться на ${title}`}><ArrowRight size={16}/></button></div>)}</div><div className="price-disclaimer"><ShieldCheck size={17}/><span>Цены ориентировочные и не являются публичной офертой. Перед ремонтом мастер согласует состав работ и стоимость.</span></div></div></section>
      <section id="process" className="section process-section"><div className="container process-layout"><div className="process-copy"><p className="eyebrow">Простой процесс</p><h2>Никаких сюрпризов<br/><i>по дороге.</i></h2><p>Мы выстраиваем работу так, чтобы вы понимали, что происходит с автомобилем на каждом шаге.</p><button className="btn btn-primary" onClick={() => setBookingOpen(true)}>Записаться на диагностику <ArrowRight size={17}/></button></div><div className="process-list">{[["01", "Заявка онлайн", "Выбираете удобное время без звонка и ожидания."], ["02", "Диагностика и смета", "Мастер показывает, что действительно требует внимания."], ["03", "Ремонт", "Согласовываем работы и подбираем детали на месте."], ["04", "Готово", "Сообщаем, когда автомобиль можно забирать."]].map(([num, title, text], i) => <div className="process-item" key={num}><span>{num}</span><div><h3>{title}</h3><p>{text}</p></div>{i < 3 && <ArrowRight size={18}/>}</div>)}</div></div></section>
      <section id="about" className="section shop-section"><div className="container shop-layout"><div className="shop-photo"><img src="/images/reaktor-parts.webp" alt="Автозапчасти и инструменты на верстаке" loading="lazy" decoding="async"/><div className="photo-tag"><ShoppingBag size={18}/> Магазин на месте</div></div><div className="shop-copy"><p className="eyebrow">Вторая половина Реактора</p><h2>Деталь не нужно<br/><i>искать по городу.</i></h2><p>На одном адресе — сервисная зона и магазин автозапчастей. Подберём нужного производителя под задачу и бюджет, привезём деталь на пост.</p><div className="shop-points"><span><Check size={16}/> Разные ценовые категории</span><span><Check size={16}/> Подбор по VIN и модели</span><span><Check size={16}/> Меньше времени на ремонт</span></div><button className="text-link" onClick={() => setBookingOpen(true)}>Уточнить наличие детали <ArrowRight size={17}/></button></div></div></section>
      <section className="section testimonials-section"><div className="container"><div className="section-intro"><div><p className="eyebrow">Говорят клиенты</p><h2>За что возвращаются<br/><i>снова и снова.</i></h2></div><div className="rating-lockup"><strong>4.5</strong><div><span>★★★★★</span><small>73 оценки на 2GIS</small><a href="https://2gis.kz/petropavlovsk/firm/70000001038459364?m=69.14079%2C54.878543%2F16" target="_blank" rel="noreferrer">Открыть карточку 2GIS →</a></div></div></div><div className="testimonial-grid">{testimonials.map((t) => <article className="testimonial" key={t.name}><div className="stars">★★★★★</div><p>“{t.quote}”</p><footer><b>{t.name}</b><span>{t.meta}</span></footer></article>)}</div></div></section>
      <section id="faq" className="section faq-section"><div className="container faq-layout"><div><p className="eyebrow">FAQ</p><h2>Частые вопросы<br/><i>без мелкого шрифта.</i></h2><p className="faq-lead">Если не нашли ответ, напишите нам или опишите вопрос в форме записи.</p><a className="btn btn-primary" href={WHATSAPP_ASK} target="_blank" rel="noreferrer">Задать вопрос <MessageCircle size={17}/></a></div><div className="faq-list"><details open><summary>Почему итоговая цена может отличаться от ориентировочной?<ChevronDown size={18}/></summary><p>Ориентир не включает неизвестный объём работ и стоимость деталей. После осмотра мастер объясняет причину неисправности, варианты ремонта и согласует итоговую сумму до начала работ.</p></details><details><summary>Можно ли приехать со своей запчастью?<ChevronDown size={18}/></summary><p>Да, это можно обсудить с администратором. Важно заранее проверить совместимость детали с автомобилем.</p></details><details><summary>Какие марки автомобилей вы обслуживаете?<ChevronDown size={18}/></summary><p>Сервис работает практически со всем модельным рядом рынка СНГ и Азии, а также с BMW, Mercedes, Lexus, Porsche и другими марками.</p></details><details><summary>Сколько занимает диагностика?<ChevronDown size={18}/></summary><p>Типовая диагностика занимает около 30–60 минут. Сложные случаи могут потребовать больше времени — мастер сообщит об этом заранее.</p></details><details><summary>Как записаться и получить подтверждение?<ChevronDown size={18}/></summary><p>Заполните форму на сайте. Администратор свяжется с вами по выбранному каналу и подтвердит время визита.</p></details></div></div></section>
      <section id="contacts" className="contact-section"><div className="container contact-layout"><div><p className="eyebrow light">Приезжайте</p><h2>Реактор<br/><i>на связи.</i></h2><div className="contact-list"><a href="tel:+77478019910"><Phone size={18}/><span><small>Телефон</small>+7 747 801-99-10</span></a><div><MapPin size={18}/><span><small>Адрес</small>ул. Магжана Жумабаева, 157<br/>Петропавловск</span></div><div><Clock3 size={18}/><span><small>Режим работы</small>Пн–Пт: 09:00–18:00<br/>Сб: 09:00–14:00 · Вс: выходной</span></div></div></div><div className="map-card"><div className="map-grid"/><div className="map-pin"><MapPin size={24} fill="currentColor"/></div><div className="map-label"><b>Реактор</b><span>6 минут от остановки «Школа Дарын»</span><a href="https://2gis.kz/petropavlovsk/firm/70000001038459364?m=69.14079%2C54.878543%2F16" target="_blank" rel="noreferrer">Открыть в 2GIS →</a></div></div></div></section>
    </main>
    <footer className="site-footer"><div className="container footer-inner"><a className="brand"><span className="brand-mark"><Zap size={17} fill="currentColor" /></span><span>РЕАКТОР<small>АВТОСЕРВИС · ПЕТРОПАВЛОВСК</small></span></a><span>© 2026 Реактор · Сервис и запчасти</span><div className="socials"><a aria-label="Instagram Реактора" href="https://instagram.com/reaktor.15kz" target="_blank" rel="noreferrer"><Instagram size={18}/></a><a aria-label="Facebook Реактора" href="https://facebook.com/reaktor.15kz" target="_blank" rel="noreferrer"><Facebook size={18}/></a></div></div></footer>
    {bookingOpen && <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setBookingOpen(false)}><div role="dialog" aria-modal="true" aria-label="Онлайн-запись в автосервис"><BookingForm onClose={() => setBookingOpen(false)}/></div></div>}
    {showFloatingBook && !bookingOpen && !menuOpen && <div className="floating-book"><button className="floating-menu-btn" aria-label="Открыть меню сайта" onClick={() => { setMenuOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Menu size={20}/></button><a className="floating-cta" onClick={() => setBookingOpen(true)}><CalendarDays size={18}/> Записаться онлайн</a></div>}
  </div>;
}
function ArrowUpRightIcon() { return <ArrowRight size={15}/>; }
