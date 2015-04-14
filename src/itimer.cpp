/***** < ivan *****/
#include "itimer.h"
#include <math.h>

#include <QDebug>

ITimer::ITimer(void)
{
qDebug() << "ITimer::ITimer";
	connect(this, SIGNAL(timeout()), this, SLOT(incCounter()));
	this->setSingleShot(false);
    m_useCallback = false;
    m_testCallback = new Callback(this);
}

ITimer::~ITimer(void)
{
}

void ITimer::incCounter()
{
qDebug() << "ITimer::incCounter" << m_counter;
	m_counter++;
	if (m_counter >= m_counter_limit)
	{
		stop();
		m_pass = false;
		m_loop.quit();
	}
	else if (m_useCallback) {
qDebug() << "ITimer::m_testCallback";
		QVariantList a;
		a << m_counter;
	    QVariant res = m_testCallback->call(a);
	    if (res.canConvert<bool>() && res.toBool()) {
	    	done();
	    }
	}
	else
	{
		emit test();
	}
}

void ITimer::done()
{
qDebug() << "ITimer::done";
	if (isActive())
	{
		stop();
		m_pass = true;
		m_loop.quit();
	}
}

bool ITimer::start(int interval, int timeout)
{
qDebug() << "ITimer::start";
	if (timeout >= interval && interval > 0 && !isActive())
	{
		m_counter = 0;
		m_counter_limit = (int)floor((double)timeout / interval);
		QTimer::start(interval);
qDebug() << "ITimer::start exec()";
		m_loop.exec();
		return m_pass;
	}
	else
	{
		return false;
	}
}

QObject *ITimer::_getTestCallback()
{
    return m_testCallback;
}

int ITimer::counter() const
{
	return m_counter;
}

bool ITimer::useCallback() const
{
	return m_useCallback;
}

void ITimer::setUseCallback(bool ucb) {
	m_useCallback = ucb;
}
/***** ivan > *****/