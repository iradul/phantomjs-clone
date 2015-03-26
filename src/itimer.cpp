/***** < ivan *****/
#include "itimer.h"
#include <math.h>

ITimer::ITimer(void)
{
	connect(this, SIGNAL(timeout()), this, SLOT(incCounter()));
	this->setSingleShot(false);
}

ITimer::~ITimer(void)
{
}

void ITimer::incCounter()
{
	m_counter++;
	if (m_counter >= m_counter_limit)
	{
		stop();
		m_pass = false;
		m_loop.quit();
	}
	else
	{
		emit test();
	}
}

void ITimer::done()
{
	if (isActive())
	{
		stop();
		m_pass = true;
		m_loop.quit();
	}
}

bool ITimer::start(int interval, int timeout)
{
	if (timeout >= interval && interval > 0 && !isActive())
	{
		m_counter = 0;
		m_counter_limit = (int)floor((double)timeout / interval);
		QTimer::start(interval);
		m_loop.exec();
		return m_pass;
	}
	else
	{
		return false;
	}
}

int ITimer::counter() const
{
	return m_counter;
}
/***** ivan > *****/