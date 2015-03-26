/***** < ivan *****/
#ifndef SQL_LITE_H
#define SQL_LITE_H

#include "./qt/qtbase/src/3rdparty/sqlite/sqlite3.h"
#include <QObject>
#include <QVariant>
#include <QList>

class SQL : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString error READ error)
    Q_PROPERTY(QVariantMap record READ record)
    Q_PROPERTY(QVariantList cell READ cell)
    Q_PROPERTY(bool isOpen READ isOpen)

	public:
		explicit SQL(QObject* parent);
		Q_INVOKABLE bool open(const QString & db);
		Q_INVOKABLE bool open(const QString & db, const QString &conOpts);
		Q_INVOKABLE void close();
		Q_INVOKABLE bool exec(const QString &query);
		Q_INVOKABLE bool exec(const QString &query, QVariantList values);
		Q_INVOKABLE bool read();
	private:
		void setError(sqlite3 *access, const QString& descr);
		void finalize();
		QString error() const;
		QVariantMap record() const;
		QVariantList cell() const;
		bool isOpen() const;
	private:
		bool m_open;
		sqlite3 *access;
		sqlite3_stmt *stmt;
		bool m_finalized;
		QVariantList m_cell;
		QVariantMap m_record;
		QString m_error;
};

#endif // SQL_LITE_H
/***** ivan > *****/

