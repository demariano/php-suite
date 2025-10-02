'use client';

import { ProductDealDto } from '@data-access/index';
import { useEffect } from 'react';

interface DeleteConfirmationModalProps {
  show: boolean;
  productDeal: ProductDealDto | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmationModal({
  show,
  productDeal,
  onConfirm,
  onCancel
}: DeleteConfirmationModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onCancel();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, onCancel]);

  if (!show || !productDeal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '32px',
        width: '480px',
        maxWidth: '90vw',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e5e7eb'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#fef2f2',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #fecaca'
          }}>
            <span style={{
              fontSize: '24px',
              color: '#dc2626'
            }}>
              ⚠️
            </span>
          </div>
          <div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0,
              marginBottom: '4px'
            }}>
              Delete Deal
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              margin: 0
            }}>
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{
          marginBottom: '32px'
        }}>
          <p style={{
            fontSize: '16px',
            color: '#374151',
            lineHeight: '1.6',
            margin: 0,
            marginBottom: '16px'
          }}>
            Are you sure you want to delete the deal <strong>&ldquo;{productDeal.productDealName}&rdquo;</strong>?
          </p>
          
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              fontSize: '14px'
            }}>
              <div>
                <span style={{
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Deal Name:
                </span>
                <div style={{
                  color: '#1f2937',
                  fontWeight: '600',
                  marginTop: '4px'
                }}>
                  {productDeal.productDealName}
                </div>
              </div>
              <div>
                <span style={{
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Status:
                </span>
                <div style={{
                  color: '#1f2937',
                  fontWeight: '600',
                  marginTop: '4px'
                }}>
                  {productDeal.status || 'ACTIVE'}
                </div>
              </div>
              <div>
                <span style={{
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Min Quantity:
                </span>
                <div style={{
                  color: '#1f2937',
                  fontWeight: '600',
                  marginTop: '4px'
                }}>
                  {productDeal.minQty || 0}
                </div>
              </div>
              <div>
                <span style={{
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  Additional Qty:
                </span>
                <div style={{
                  color: '#1f2937',
                  fontWeight: '600',
                  marginTop: '4px'
                }}>
                  {productDeal.additionalQty || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#b91c1c';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(220, 38, 38, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(220, 38, 38, 0.3)';
            }}
          >
            Delete Deal
          </button>
        </div>
      </div>
    </div>
  );
}
