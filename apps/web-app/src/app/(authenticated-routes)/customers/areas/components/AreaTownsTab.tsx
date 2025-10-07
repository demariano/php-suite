'use client';

import TownApi from '@data-access/api/town.api';
import { StatusEnum, TownDto, useEnv, useLocalStore } from '@data-access/index';
import { useEffect, useState } from 'react';

interface AreaTownsTabProps {
  areaId: string;
  areaName: string;
  userRole?: string;
  onClose?: () => void;
}

export default function AreaTownsTab({ areaId, areaName, userRole, onClose }: AreaTownsTabProps) {
  const [towns, setTowns] = useState<TownDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { env } = useEnv();
  const { authedUser } = useLocalStore();

  // Get user role for API calls
  const getUserRole = () => {
    return env.BYPASS_AUTH === 'ENABLED' ? authedUser?.userRole : userRole;
  };

  // Fetch towns for the area
  const fetchTownsForArea = async () => {
    if (!areaId) {
      console.log('No areaId provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching towns for area:', areaId, 'with user role:', getUserRole());

      // Get towns for all statuses
      const [activeResponse, pendingResponse, deletedResponse] = await Promise.all([
        TownApi.getTownsByAreaStatus(areaId, StatusEnum.ACTIVE, getUserRole()),
        TownApi.getTownsByAreaStatus(areaId, StatusEnum.FOR_APPROVAL, getUserRole()),
        TownApi.getTownsByAreaStatus(areaId, StatusEnum.FOR_DELETION, getUserRole())
      ]);

      
      // The response is an object with numeric indices, not a true array
      // Convert it to an array by extracting the values
      const activeTownsArray = Object.values(activeResponse).filter(item => 
        typeof item === 'object' && item !== null && item.townId
      );
      
      const pendingTownsArray = Object.values(pendingResponse).filter(item => 
        typeof item === 'object' && item !== null && item.townId
      );
      
      const deletedTownsArray = Object.values(deletedResponse).filter(item => 
        typeof item === 'object' && item !== null && item.townId
      );
      
      // Combine all towns
      const allTowns = [
        ...activeTownsArray,
        ...pendingTownsArray,
        ...deletedTownsArray
      ];

      console.log('Combined towns:', allTowns);
      setTowns(allTowns);
    } catch (err) {
      console.error('Error fetching towns for area:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        areaId,
        userRole: getUserRole()
      });
      setError('Failed to load towns for this area. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTownsForArea();
  }, [areaId]);

  const getStatusBadge = (status: StatusEnum) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase";
    
    let colorClasses = "";
    if (status === StatusEnum.ACTIVE) {
      colorClasses = "!bg-green-100 !text-green-800";
    } else if (status === StatusEnum.FOR_APPROVAL) {
      colorClasses = "!bg-yellow-100 !text-yellow-800";
    } else if (status === StatusEnum.FOR_DELETION) {
      colorClasses = "!bg-red-100 !text-red-800";
    } else if (status === StatusEnum.NEW_RECORD) {
      colorClasses = "!bg-blue-100 !text-blue-800";
    } else {
      colorClasses = "!bg-gray-100 !text-gray-600";
    }
    
    return (
      <span className={`${baseClasses} ${colorClasses}`} style={{ 
        backgroundColor: status === StatusEnum.ACTIVE ? '#dcfce7' : 
                        status === StatusEnum.FOR_APPROVAL ? '#fef3c7' : 
                        status === StatusEnum.FOR_DELETION ? '#fef2f2' : 
                        status === StatusEnum.NEW_RECORD ? '#dbeafe' : '#f3f4f6', 
        color: status === StatusEnum.ACTIVE ? '#166534' : 
               status === StatusEnum.FOR_APPROVAL ? '#92400e' : 
               status === StatusEnum.FOR_DELETION ? '#dc2626' : 
               status === StatusEnum.NEW_RECORD ? '#1e40af' : '#6b7280' 
      }}>
        {status}
      </span>
    );
  };

  const groupTownsByStatus = (towns: TownDto[]) => {
    const grouped = {
      [StatusEnum.ACTIVE]: towns.filter(town => town.status === StatusEnum.ACTIVE),
      [StatusEnum.FOR_APPROVAL]: towns.filter(town => town.status === StatusEnum.FOR_APPROVAL),
      [StatusEnum.FOR_DELETION]: towns.filter(town => town.status === StatusEnum.FOR_DELETION),
      [StatusEnum.NEW_RECORD]: towns.filter(town => town.status === StatusEnum.NEW_RECORD),
      other: towns.filter(town => ![StatusEnum.ACTIVE, StatusEnum.FOR_APPROVAL, StatusEnum.FOR_DELETION, StatusEnum.NEW_RECORD].includes(town.status))
    };
    return grouped;
  };

  const groupedTowns = groupTownsByStatus(towns);

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '20px'
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#3b82f6',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          🏘️
        </div>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>
          Towns in {areaName}
        </h3>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '2px solid #fecaca',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#dc2626',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ⚠
          </div>
          <span style={{
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            {error}
          </span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '12px'
          }} />
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          Loading towns...
        </div>
      )}

      {/* Towns Content */}
      {!isLoading && !error && (
        <div>
          {towns.length === 0 ? (
            <div style={{
              backgroundColor: '#f8fafc',
              border: '2px solid #e2e8f0',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '16px'
              }}>
                🏘️
              </div>
              <p style={{
                fontSize: '16px',
                fontWeight: '500',
                margin: 0,
                marginBottom: '8px'
              }}>
                No towns found
              </p>
              <p style={{
                fontSize: '14px',
                margin: 0
              }}>
                This area doesn't have any towns yet.
              </p>
            </div>
          ) : (
            <div>
              {/* Active Towns */}
              {groupedTowns[StatusEnum.ACTIVE].length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#16a34a',
                      borderRadius: '50%'
                    }} />
                    Active Towns ({groupedTowns[StatusEnum.ACTIVE].length})
                  </h4>
                  <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    {groupedTowns[StatusEnum.ACTIVE].map((town, index) => (
                      <div key={town.townId || index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: index < groupedTowns[StatusEnum.ACTIVE].length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          {town.townName}
                        </span>
                        {getStatusBadge(town.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Towns */}
              {groupedTowns[StatusEnum.FOR_APPROVAL].length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#f59e0b',
                      borderRadius: '50%'
                    }} />
                    Pending Approval ({groupedTowns[StatusEnum.FOR_APPROVAL].length})
                  </h4>
                  <div style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fed7aa',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    {groupedTowns[StatusEnum.FOR_APPROVAL].map((town, index) => (
                      <div key={town.townId || index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: index < groupedTowns[StatusEnum.FOR_APPROVAL].length - 1 ? '1px solid #fef3c7' : 'none'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#92400e'
                        }}>
                          {town.townName}
                        </span>
                        {getStatusBadge(town.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Record Towns */}
              {groupedTowns[StatusEnum.NEW_RECORD].length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%'
                    }} />
                    New Records ({groupedTowns[StatusEnum.NEW_RECORD].length})
                  </h4>
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    {groupedTowns[StatusEnum.NEW_RECORD].map((town, index) => (
                      <div key={town.townId || index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: index < groupedTowns[StatusEnum.NEW_RECORD].length - 1 ? '1px solid #dbeafe' : 'none'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1e40af'
                        }}>
                          {town.townName}
                        </span>
                        {getStatusBadge(town.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deleted Towns */}
              {groupedTowns[StatusEnum.FOR_DELETION].length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#dc2626',
                      borderRadius: '50%'
                    }} />
                    Pending Deletion ({groupedTowns[StatusEnum.FOR_DELETION].length})
                  </h4>
                  <div style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    {groupedTowns[StatusEnum.FOR_DELETION].map((town, index) => (
                      <div key={town.townId || index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: index < groupedTowns[StatusEnum.FOR_DELETION].length - 1 ? '1px solid #fef2f2' : 'none'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#dc2626'
                        }}>
                          {town.townName}
                        </span>
                        {getStatusBadge(town.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Status Towns */}
              {groupedTowns.other.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#6b7280',
                      borderRadius: '50%'
                    }} />
                    Other Status ({groupedTowns.other.length})
                  </h4>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '16px'
                  }}>
                    {groupedTowns.other.map((town, index) => (
                      <div key={town.townId || index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: index < groupedTowns.other.length - 1 ? '1px solid #e5e7eb' : 'none'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#6b7280'
                        }}>
                          {town.townName}
                        </span>
                        {getStatusBadge(town.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              Close
            </button>
          )}
        </div>
        
        <button
          onClick={fetchTownsForArea}
          disabled={isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s ease',
            opacity: isLoading ? 0.7 : 1
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }
          }}
        >
          {isLoading ? 'Refreshing...' : 'Refresh Towns'}
        </button>
      </div>
    </div>
  );
}
