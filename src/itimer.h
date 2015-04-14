/***** < ivan *****/
#ifndef ITIMER_H
#define ITIMER_H

#include <QTimer>
#include <QEventLoop>
#include "callback.h"

class ITimer :
	public QTimer
{
    Q_OBJECT
	Q_PROPERTY(int counter READ counter)
	Q_PROPERTY(bool useCallback READ useCallback WRITE setUseCallback)

signals:
	void test();
private:
    bool m_useCallback;
    Callback *m_testCallback;
	bool m_pass;
	int m_counter;
	int m_counter_limit;
	QEventLoop m_loop;

	void start();
	void start(int interval);
private slots:
	void incCounter();
public slots:
	void done();
    QObject *_getTestCallback();
public:
	ITimer(void);
	~ITimer(void);
	int counter() const;
	bool useCallback() const;
	void setUseCallback(bool ucb);
	Q_INVOKABLE bool start(int interval, int timeout);
};

#endif // ITIMER_H
/***** ivan > *****/