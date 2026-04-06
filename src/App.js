import './App.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAndActivate, getString } from "firebase/remote-config";
import { remoteConfig } from './firebase';

const formatMoney = (n) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 });

const ADSENSE_TOP_SLOT = process.env.REACT_APP_ADSENSE_TOP_SLOT || '';
const ADSENSE_BOTTOM_SLOT = process.env.REACT_APP_ADSENSE_BOTTOM_SLOT || '';

function AdBanner({ slot }) {
  const adRef = useRef(null);

  useEffect(() => {
    if (!slot) return;

    const adNode = adRef.current;
    if (!adNode) return;

    if (adNode.getAttribute('data-adsbygoogle-status') === 'done') return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Prevent UI crashes if AdSense is blocked by the browser or extensions.
    }
  }, [slot]);

  if (!slot) return null;

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-2768901988841601"
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

function App() {
  const [reglas, setReglas] = useState(null);
  const [brutoInput, setBrutoInput] = useState('');
  const [desglose, setDesglose] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAndActivate(remoteConfig)
      .then(() => {
        const configJson = getString(remoteConfig, 'reglas_fiscales_2026');
        if (configJson) setReglas(JSON.parse(configJson));
        else setError('No se pudieron cargar las reglas fiscales.');
      })
      .catch(() => setError('Error al conectar con el servidor.'));
  }, []);

  const calcular = useCallback((bruto) => {
    if (!reglas || bruto <= 0) {
      setDesglose(null);
      return;
    }

    const { aportes, ganancias } = reglas;

    const jubilacion = bruto * aportes.jubilacion;
    const obraSocial = bruto * aportes.obra_social;
    const pami = bruto * aportes.pami;
    const totalAportes = jubilacion + obraSocial + pami;

    let retencionGanancias = 0;
    let tramoAplicado = null;
    let gananciaSujeta = 0;

    if (bruto > ganancias.minimo_no_imponible) {
      gananciaSujeta = bruto - ganancias.minimo_no_imponible;
      tramoAplicado = [...ganancias.escalas]
        .reverse()
        .find(t => gananciaSujeta > t.limiteInferior);
      if (tramoAplicado) {
        const excedente = gananciaSujeta - tramoAplicado.limiteInferior;
        retencionGanancias = tramoAplicado.cuotaFija + excedente * tramoAplicado.porcentaje;
      }
    }

    const totalDescuentos = totalAportes + retencionGanancias;
    const neto = bruto - totalDescuentos;

    setDesglose({
      bruto,
      jubilacion,
      obraSocial,
      pami,
      totalAportes,
      gananciaSujeta,
      retencionGanancias,
      tramoAplicado,
      totalDescuentos,
      neto,
    });
  }, [reglas]);

  const handleChange = (e) => {
    const val = e.target.value;
    setBrutoInput(val);
    calcular(Number(val) || 0);
  };

  const shouldShowAds = Boolean(desglose && !error);

  return (
    <div className="app">
      <header className="header">
        <h1>Calculadora de Sueldo Neto</h1>
        <p className="subtitle">Argentina 2026 — Estimá tu sueldo de bolsillo</p>
      </header>

      <main className="calculator">
        {error && <div className="error-msg">{error}</div>}

        {!reglas && !error && (
          <div className="loading">
            <div className="spinner" />
            <p>Cargando reglas fiscales…</p>
          </div>
        )}

        {reglas && (
          <>
            <div className="input-group">
              <label htmlFor="bruto">Sueldo bruto mensual</label>
              <div className="input-wrapper">
                <span className="input-prefix">$</span>
                <input
                  id="bruto"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ej: 1500000"
                  value={brutoInput}
                  onChange={handleChange}
                  autoFocus
                />
              </div>
            </div>

            <section className="card content-card">
              <h2>Cómo estimamos tu sueldo neto</h2>
              <p>
                Esta herramienta toma tu sueldo bruto mensual y aplica los descuentos obligatorios del trabajador en Argentina:
                jubilación, obra social y PAMI.
              </p>
              <ul>
                <li>Calcula cada aporte de forma individual para que veas cuánto impacta cada concepto.</li>
                <li>Evalúa si superás el mínimo no imponible de Ganancias.</li>
                <li>Si corresponde, aplica la escala y alícuota del tramo alcanzado.</li>
                <li>Te muestra el neto final y el porcentaje total de retención.</li>
              </ul>
              <p>
                El resultado es orientativo y está pensado para ayudarte a planificar ingresos, negociar ajustes o comparar escenarios.
              </p>
            </section>

            {desglose && (
              <div className="results">
                {/* Aportes */}
                <section className="card aportes-card">
                  <h2>Aportes del trabajador</h2>
                  <div className="line">
                    <span>Jubilación (11%)</span>
                    <span className="amount negative">- {formatMoney(desglose.jubilacion)}</span>
                  </div>
                  <div className="line">
                    <span>Obra Social (3%)</span>
                    <span className="amount negative">- {formatMoney(desglose.obraSocial)}</span>
                  </div>
                  <div className="line">
                    <span>PAMI (3%)</span>
                    <span className="amount negative">- {formatMoney(desglose.pami)}</span>
                  </div>
                  <div className="line subtotal">
                    <span>Subtotal aportes (17%)</span>
                    <span className="amount negative">- {formatMoney(desglose.totalAportes)}</span>
                  </div>
                </section>

                {/* Ganancias */}
                <section className="card ganancias-card">
                  <h2>Impuesto a las Ganancias</h2>
                  {desglose.retencionGanancias > 0 ? (
                    <>
                      <div className="line info">
                        <span>Mínimo no imponible</span>
                        <span>{formatMoney(reglas.ganancias.minimo_no_imponible)}</span>
                      </div>
                      <div className="line info">
                        <span>Ganancia sujeta a impuesto</span>
                        <span>{formatMoney(desglose.gananciaSujeta)}</span>
                      </div>
                      {desglose.tramoAplicado && (
                        <div className="line info">
                          <span>Alícuota del tramo</span>
                          <span>{(desglose.tramoAplicado.porcentaje * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      <div className="line subtotal">
                        <span>Retención Ganancias</span>
                        <span className="amount negative">- {formatMoney(desglose.retencionGanancias)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="no-ganancias">No alcanzado por Ganancias ✓</p>
                  )}
                </section>

                {/* Resumen */}
                <section className="card resumen-card">
                  <div className="line">
                    <span>Sueldo bruto</span>
                    <span className="amount">{formatMoney(desglose.bruto)}</span>
                  </div>
                  <div className="line">
                    <span>Total descuentos</span>
                    <span className="amount negative">- {formatMoney(desglose.totalDescuentos)}</span>
                  </div>
                  <div className="line neto-line">
                    <span>Sueldo neto (de bolsillo)</span>
                    <span className="amount neto">{formatMoney(desglose.neto)}</span>
                  </div>
                  <div className="porcentaje-retencion">
                    Te descuentan el {((desglose.totalDescuentos / desglose.bruto) * 100).toFixed(1)}% de tu sueldo bruto
                  </div>
                </section>
              </div>
            )}

            {shouldShowAds && ADSENSE_TOP_SLOT && (
              <div className="ad-wrapper" id="ad-top">
                <p className="ad-label">Publicidad</p>
                <div className="ad-banner">
                  <AdBanner slot={ADSENSE_TOP_SLOT} />
                </div>
              </div>
            )}

            <section className="card content-card">
              <h2>Fuentes y alcance</h2>
              <p>
                Las reglas fiscales se cargan desde configuración remota para mantener valores actualizados durante el año sin que
                tengas que esperar una nueva versión de la app.
              </p>
              <p>
                Para decisiones formales de liquidación o temas contractuales, siempre conviene validar con tu recibo de sueldo,
                convenio aplicable y asesoramiento contable.
              </p>
            </section>
          </>
        )}
      </main>

      {shouldShowAds && ADSENSE_BOTTOM_SLOT && (
        <div className="ad-wrapper" id="ad-bottom">
          <p className="ad-label">Publicidad</p>
          <div className="ad-banner">
            <AdBanner slot={ADSENSE_BOTTOM_SLOT} />
          </div>
        </div>
      )}

      <footer className="footer">
        <p>Los valores se obtienen de fuentes oficiales y pueden variar. Esta herramienta es orientativa.</p>
        <p>© 2026 Calculadora Sueldo AR</p>
      </footer>
    </div>
  );
}

export default App;
