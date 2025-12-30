import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { Category } from '../types';
import { electronAPI } from '../utils/electron-api';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    icon: '',
    color: '#007aff',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await electronAPI.getCategories();
    setCategories(data.map((c: any) => ({
      id: c.id,
      name: c.name,
      icon: c.icon || undefined,
      color: c.color || undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: formData.name!,
      icon: formData.icon || undefined,
      color: formData.color || undefined,
    };

    if (editingCategory?.id) {
      await electronAPI.updateCategory(editingCategory.id, categoryData);
    } else {
      await electronAPI.createCategory(categoryData);
    }

    await loadCategories();
    handleCloseModal();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon || '',
      color: category.color || '#007aff',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this category? This will not delete transactions, but they will lose their category association.')) {
      await electronAPI.deleteCategory(id);
      await loadCategories();
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: '',
      color: '#007aff',
    });
  };

  const predefinedColors = [
    '#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de',
    '#ff2d55', '#5856d6', '#5ac8fa', '#ffcc00', '#8e8e93'
  ];

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Categories</h2>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} style={{ marginRight: '0.5rem' }} />
            Create Category
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">
            <h3>No categories yet</h3>
            <p>Create categories to organize your expenses (food, rent, travel, etc.)</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {categories.map((category) => (
              <div
                key={category.id}
                style={{
                  border: '1px solid #e5e5ea',
                  borderRadius: '8px',
                  padding: '1rem',
                  background: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: category.color || '#007aff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    <Tag size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{category.name}</div>
                    {category.icon && (
                      <div style={{ fontSize: '0.75rem', color: '#8e8e93' }}>
                        Icon: {category.icon}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleEdit(category)}
                    style={{ padding: '0.5rem' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => category.id && handleDelete(category.id)}
                    style={{ padding: '0.5rem' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Food, Rent, Travel"
                />
              </div>

              <div className="form-group">
                <label>Icon (Optional)</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., 🍔, 🏠, ✈️"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: color,
                        border: formData.color === color ? '2px solid #000' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  style={{ marginTop: '0.5rem', width: '100%', height: '40px' }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

