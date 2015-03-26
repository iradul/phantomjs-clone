/***** < ivan *****/

#include "sql.h"

#include <QObject>
#include <QDebug>
#include <QStringList>
#include <QDateTime>

SQL::SQL(QObject* parent) 
	: QObject(parent), m_open(false), m_finalized(true)
{
	qDebug() << "SQL - instance created";
}

void SQL::setError(sqlite3 *access, const QString& descr)
{
	if (access != 0) {
		m_error = descr + ": " + QString(reinterpret_cast<const QChar *>(sqlite3_errmsg16(access)));
	}
	else {
		m_error = descr;
	}
	qDebug() << "#### SQL - error: " << m_error;
}

QString SQL::error() const
{
	return m_error;
}

void SQL::finalize()
{
	if (!m_finalized) {
		qDebug() << "SQL - finalize";
		sqlite3_finalize(stmt);
		m_finalized = true;
	}
}

QVariantMap SQL::record() const
{
	return m_record;
}

QVariantList SQL::cell() const
{
	return m_cell;
}

bool SQL::isOpen() const
{
	return m_open;
}

bool SQL::open(const QString & db)
{
	return open(db, "");
}

bool SQL::open(const QString & db, const QString &conOpts)
{
	if (m_open)
		close();
	qDebug() << "SQL - open: " << db;
	int timeOut = 5000;
	bool sharedCache = false;
	bool openReadOnlyOption = false;
	bool openUriOption = false;
	const QStringList opts = QString(conOpts).remove(QLatin1Char(' ')).split(QLatin1Char(';'));
	foreach(const QString &option, opts) {
		if (option.startsWith(QLatin1String("BUSY_TIMEOUT="))) {
			timeOut = option.midRef(21).toString().toInt();
		}
		else if (option == QLatin1String("OPEN_READONLY")) {
			openReadOnlyOption = true;
		}
		else if (option == QLatin1String("OPEN_URI")) {
			openUriOption = true;
		}
		else if (option == QLatin1String("ENABLE_SHARED_CACHE")) {
			sharedCache = true;
		}
	}
	int openMode = (openReadOnlyOption ? SQLITE_OPEN_READONLY : (SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE));
	if (openUriOption)
		openMode |= SQLITE_OPEN_URI;
	sqlite3_enable_shared_cache(sharedCache);
	if (sqlite3_open_v2(db.toUtf8().constData(), &access, openMode, NULL) == SQLITE_OK) {
		sqlite3_busy_timeout(access, timeOut);
		m_open = true;
		return true;
	}
	else {
		if (access) {
			sqlite3_close(access);
			access = 0;
		}
		setError(access, "Error opening database");
		return false;
	}
}
void SQL::close()
{
	if (m_open) {
		qDebug() << "SQL - close";
		finalize();
		if (sqlite3_close(access) != SQLITE_OK)
			setError(access, "Error closing database");
		access = 0;
		m_open = false;
	}
}

bool SQL::exec(const QString &query)
{
	return exec(query, QVariantList());
}

bool SQL::exec(const QString &query, QVariantList values)
{
	if (!m_open) {
		qDebug() << "SQL - exec: can't exec not open db";
		return false;
	}
	qDebug() << "SQL - exec: " << query;
	const void *pzTail = NULL;
	
	finalize();
	qDebug() << "SQL - exec: prepare sqlite3";
	int res = sqlite3_prepare16(access, query.constData(), (query.size() + 1) * sizeof(QChar), &stmt, &pzTail);
	if (res != SQLITE_OK) {
		setError(access, "Unable to execute statement");
		return false;
	}
	else if (pzTail && !QString(reinterpret_cast<const QChar *>(pzTail)).trimmed().isEmpty()) {
		setError(access, "Unable to execute multiple statements at a time");
		return false;
	}
	
	qDebug() << "SQL - exec: reset sqlite3";
	res = sqlite3_reset(stmt);
	if (res != SQLITE_OK) {
		setError(access, "Unable to reset statement");
		return false;
	}
	qDebug() << "SQL - exec: bind parameters sqlite3";
	int paramCount = sqlite3_bind_parameter_count(stmt);
	if (paramCount == values.count()) {
		for (int i = 0; i < paramCount; ++i) {
			res = SQLITE_OK;
			const QVariant value = values.at(i);
			if (value.isNull()) {
				res = sqlite3_bind_null(stmt, i + 1);
			}
			else {
				switch (value.type()) {
				case QVariant::ByteArray: {
											  const QByteArray *ba = static_cast<const QByteArray*>(value.constData());
											  res = sqlite3_bind_blob(stmt, i + 1, ba->constData(),
												  ba->size(), SQLITE_STATIC);
											  break; }
				case QVariant::Int:
				case QVariant::Bool:
					res = sqlite3_bind_int(stmt, i + 1, value.toInt());
					break;
				case QVariant::Double:
					res = sqlite3_bind_double(stmt, i + 1, value.toDouble());
					break;
				case QVariant::UInt:
				case QVariant::LongLong:
					res = sqlite3_bind_int64(stmt, i + 1, value.toLongLong());
					break;
				case QVariant::DateTime: {
											 const QDateTime dateTime = value.toDateTime();
											 const QString str = dateTime.toString(QString("yyyy-MM-ddThh:mm:ss.zzz"));
											 res = sqlite3_bind_text16(stmt, i + 1, str.utf16(),
												 str.size() * sizeof(ushort), SQLITE_TRANSIENT);
											 break;
				}
				case QVariant::Time: {
										 const QTime time = value.toTime();
										 const QString str = time.toString(QString("hh:mm:ss.zzz"));
										 res = sqlite3_bind_text16(stmt, i + 1, str.utf16(),
											 str.size() * sizeof(ushort), SQLITE_TRANSIENT);
										 break;
				}
				case QVariant::String: {
										   // lifetime of string == lifetime of its qvariant
										   const QString *str = static_cast<const QString*>(value.constData());
										   res = sqlite3_bind_text16(stmt, i + 1, str->utf16(),
											   (str->size()) * sizeof(QChar), SQLITE_STATIC);
										   break; }
				default: {
							 QString str = value.toString();
							 // SQLITE_TRANSIENT makes sure that sqlite buffers the data
							 res = sqlite3_bind_text16(stmt, i + 1, str.utf16(),
								 (str.size()) * sizeof(QChar), SQLITE_TRANSIENT);
							 break; }
				}
			}
			if (res != SQLITE_OK) {
				setError(access, "Unable to bind parameters");
				return false;
			}
		}
	}
	else {
		setError(0, "Parameter count mismatch");
		return false;
	}
	m_finalized = false;
	read();
	return true;
}


bool SQL::read()
{
	if (!m_open) {
		qDebug() << "SQL - read: can't read not opened db";
		return false;
	}
	qDebug() << "SQL - read";
	int res;
	int i;
	int nCols;
	m_record.clear();
	m_cell.clear();
	QString colName;
	if (!stmt) {
		setError(0, "Unable to fetch row");
		return false;
	}
	qDebug() << "SQL - read: step sqlite3";
	res = sqlite3_step(stmt);
	switch (res) {
	case SQLITE_ROW:
		nCols = sqlite3_column_count(stmt);
		for (i = 0; i < nCols; ++i) {
			colName = QString(reinterpret_cast<const QChar *>(
				sqlite3_column_name16(stmt, i))
				).remove(QLatin1Char('"'));
			switch (sqlite3_column_type(stmt, i)) {
			case SQLITE_BLOB:
				m_record[colName] = QByteArray(static_cast<const char *>(
					sqlite3_column_blob(stmt, i)),
					sqlite3_column_bytes(stmt, i));
				break;
			case SQLITE_INTEGER:
				m_record[colName] = sqlite3_column_int64(stmt, i);
				break;
			case SQLITE_FLOAT:
				m_record[colName] = sqlite3_column_double(stmt, i);
				break;
			case SQLITE_NULL:
				m_record[colName] = QVariant(QVariant::String);
				break;
			default:
				m_record[colName] = QString(reinterpret_cast<const QChar *>(
					sqlite3_column_text16(stmt, i)),
					sqlite3_column_bytes16(stmt, i) / sizeof(QChar));
				break;
			}
			m_cell.append(m_record[colName]);
		}
		return true;
	case SQLITE_DONE:
		sqlite3_reset(stmt);
		return false;
	case SQLITE_CONSTRAINT:
	case SQLITE_ERROR:
		res = sqlite3_reset(stmt);
		setError(access, "Unable to fetch row");
		return false;
	case SQLITE_MISUSE:
	case SQLITE_BUSY:
	default:
		setError(access, "Unable to fetch row");
		sqlite3_reset(stmt);
		return false;
	}
	return false;
}

/***** ivan > *****/
