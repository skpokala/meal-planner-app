import React, { useState } from 'react';
import { Package, Store } from 'lucide-react';
import Ingredients from './Ingredients';
import Stores from './Stores';

const MasterData = () => {
  const [activeTab, setActiveTab] = useState('ingredients');

  const tabs = [
    {
      id: 'ingredients',
      name: 'Ingredients',
      icon: Package,
      component: Ingredients
    },
    {
      id: 'stores',
      name: 'Stores',
      icon: Store,
      component: Stores
    }
    // Future tabs can be added here
    // { id: 'categories', name: 'Categories', icon: Tag, component: Categories },
    // { id: 'suppliers', name: 'Suppliers', icon: Truck, component: Suppliers },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Master Data</h1>
        <p className="text-gray-600">Manage your ingredients, categories, and other master data</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default MasterData; 