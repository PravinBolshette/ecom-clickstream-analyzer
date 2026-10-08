import React, { useEffect, useState, useRef } from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import OverviewTab from './tabs/OverviewTab.jsx';
import CategoriesTab from './tabs/CategoriesTab.jsx';
import ProductsTab from './tabs/ProductsTab.jsx';
import BehaviorTab from './tabs/BehaviorTab.jsx';
import ClusterTab from './tabs/ClusterTab.jsx';
import { fetchSummary } from '../services/api.js';

const TABS = [
  { id: 'tab-link-overview', path: '/home/overview', label: 'Overview', ariaControls: 'tab-overview' },
  { id: 'tab-link-categories', path: '/home/categories', label: 'Categories', ariaControls: 'tab-categories' },
  { id: 'tab-link-products', path: '/home/products', label: 'Products & Friction', ariaControls: 'tab-products' },
  { id: 'tab-link-behavior', path: '/home/behavior', label: 'Behavior', ariaControls: 'tab-behavior' },
  { id: 'tab-link-cluster', path: '/home/cluster', label: 'Cluster', ariaControls: 'tab-cluster' }
];

export default function Home() {
  const [summary, setSummary] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const navTabsRef = useRef(null);

  const username = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('clickstream_user')) || 'admin';

  useEffect(() => {
    fetchSummary()
      .then(setSummary)
      .catch((err) => console.warn('Could not fetch hero summary:', err.message));
  }, []);

  const handleSignOut = () => {
    sessionStorage.removeItem('clickstream_token');
    sessionStorage.removeItem('clickstream_user');
    navigate('/login', { replace: true });
  };

  // Keyboard navigation for WAI-ARIA tablist
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIdx = (index + 1) % TABS.length;
      navigate(TABS[nextIdx].path);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIdx = (index - 1 + TABS.length) % TABS.length;
      navigate(TABS[prevIdx].path);
    } else if (e.key === 'Home') {
      e.preventDefault();
      navigate(TABS[0].path);
    } else if (e.key === 'End') {
      e.preventDefault();
      navigate(TABS[TABS.length - 1].path);
    }
  };

  return (
    <div className="home-container">
      {/* Top Header */}
      <header className="home-header">
        <div className="home-header-left">
          <span className="logo">Clickstream</span>
          <span className="header-badge">Hadoop MapReduce</span>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        <div className={`home-header-right ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          {/* Accessible Tab Navigation */}
          <nav
            ref={navTabsRef}
            className="home-nav-tabs"
            role="tablist"
            aria-label="Analytics Sections"
          >
            {TABS.map((tab, idx) => {
              const isActive = location.pathname === tab.path || (tab.path === '/home/overview' && location.pathname === '/home');
              return (
                <NavLink
                  key={tab.path}
                  id={tab.id}
                  to={tab.path}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={tab.ariaControls}
                  tabIndex={isActive ? 0 : -1}
                  className={({ isActive: linkActive }) =>
                    `nav-tab ${linkActive || (tab.path === '/home/overview' && location.pathname === '/home') ? 'active' : ''}`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                >
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="user-profile">
            <span className="user-name">{username}</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="signout-btn"
              aria-label="Sign out of account"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* 3D Funnel Flow Hero Section */}
      <Hero
        views={summary?.views || 802574}
        carts={summary?.cartAdds || 360035}
        purchases={summary?.purchases || 138275}
        conversion={summary?.conversionRate || 17.23}
        abandonment={summary?.cartAbandonmentRate || 61.59}
        peakHour={summary?.peakHour || 10}
      />

      {/* Routed Tab Area */}
      <main className="home-main tab-view-area">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewTab />} />
          <Route path="categories" element={<CategoriesTab />} />
          <Route path="products" element={<ProductsTab />} />
          <Route path="behavior" element={<BehaviorTab />} />
          <Route path="cluster" element={<ClusterTab />} />

          {/* Backward compatibility routes */}
          <Route path="funnel" element={<Navigate to="overview" replace />} />
          <Route path="traffic" element={<Navigate to="overview" replace />} />
          <Route path="how-it-works" element={<Navigate to="cluster" replace />} />

          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}
