/***** < ivan *****/
#ifndef ITIMER_H
#define ITIMER_H

#include <QTimer>
#include <QEventLoop>

class ITimer :
	public QTimer
{
    Q_OBJECT
	Q_PROPERTY(int counter READ counter)

signals:
	void test();
private:
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
public:
	ITimer(void);
	~ITimer(void);
	int counter() const;
	bool start(int interval, int timeout);
};

#endif // ITIMER_H
/***** ivan > *****/