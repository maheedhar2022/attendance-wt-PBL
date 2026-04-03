import { useState, useEffect } from 'react';
import { attendanceAPI, coursesAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import Table, { TableRow, TableCell } from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAttendance(); }, []);

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const res = user?.role === 'instructor' 
        ? await attendanceAPI.getReport() 
        : await attendanceAPI.getMyAttendance();
      
      setRecords(res.data.records || res.data.attendance || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading attendance records...</div>;

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <h1 className="page-title">Attendance Records</h1>
          <p className="page-subtitle">Detailed history of session attendance.</p>
        </div>
      </div>

      <Card>
        <Table headers={['Student Name', 'Session Name', 'Date', 'Status']}>
          {records.length === 0 ? null : records.map(record => (
            <TableRow key={record._id}>
              <TableCell style={{ fontWeight: 500 }}>
                {record.student?.name || user?.name || 'Unknown User'}
              </TableCell>
              <TableCell>{record.session?.title || record.session?.topic || 'Class Session'}</TableCell>
              <TableCell>
                {record.session?.date ? format(new Date(record.session.date), 'MMM d, yyyy') : 'Unknown Date'}
              </TableCell>
              <TableCell>
                <Badge variant={record.status}>{record.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </Card>
    </div>
  );
}
